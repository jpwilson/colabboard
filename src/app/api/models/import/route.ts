import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { inflateRawSync } from 'zlib'

const SKETCHFAB_TOKEN = process.env.SKETCHFAB_API_TOKEN
const MAX_UPLOADS_PER_USER = 10

// MIME types for common file extensions
const MIME_TYPES: Record<string, string> = {
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  bin: 'application/octet-stream',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/**
 * Import a 3D model from Sketchfab.
 * 1. Gets the download URL from Sketchfab (requires API token)
 * 2. Downloads the glTF zip
 * 3. Extracts ALL files (gltf + bin + textures) and uploads to Supabase Storage
 * 4. Returns the public URL of the main model file
 */
export async function POST(request: Request) {
  if (!SKETCHFAB_TOKEN) {
    return NextResponse.json({ error: 'Sketchfab API token not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { uid, name } = (await request.json()) as { uid?: string; name?: string }
  if (!uid) {
    return NextResponse.json({ error: 'Model uid is required' }, { status: 400 })
  }

  // Check upload limit
  const { count } = await supabase
    .from('model_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_UPLOADS_PER_USER) {
    return NextResponse.json(
      { error: `Upload limit reached (${MAX_UPLOADS_PER_USER} models max)` },
      { status: 429 },
    )
  }

  try {
    // Step 1: Get download URL from Sketchfab
    const dlRes = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
      headers: { Authorization: `Token ${SKETCHFAB_TOKEN}` },
    })
    if (!dlRes.ok) {
      const err = await dlRes.text()
      return NextResponse.json(
        { error: `Sketchfab download failed: ${err}` },
        { status: dlRes.status },
      )
    }
    const dlData = await dlRes.json()
    const gltfInfo = dlData.gltf
    if (!gltfInfo?.url) {
      return NextResponse.json({ error: 'No glTF download available for this model' }, { status: 404 })
    }

    // Step 2: Download the glTF zip
    const zipRes = await fetch(gltfInfo.url)
    if (!zipRes.ok) {
      return NextResponse.json({ error: 'Failed to download model file' }, { status: 502 })
    }
    const zipBuffer = await zipRes.arrayBuffer()

    // Step 3: Extract ALL files from the zip
    const files = extractAllFromZip(new Uint8Array(zipBuffer))
    if (files.length === 0) {
      return NextResponse.json({ error: 'Could not extract files from archive' }, { status: 422 })
    }

    // Find the main model file (.glb preferred, then .gltf)
    const mainFile = files.find((f) => f.name.endsWith('.glb'))
      || files.find((f) => f.name.endsWith('.gltf'))
    if (!mainFile) {
      return NextResponse.json({ error: 'No 3D model file found in archive' }, { status: 422 })
    }

    // Step 4: Upload ALL files to Supabase Storage, preserving directory structure
    const safeName = (name || uid).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
    const baseDir = `${user.id}/${uid}_${safeName}`
    let totalSize = 0

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      const filePath = `${baseDir}/${file.name}`

      await supabase.storage
        .from('3d-models')
        .upload(filePath, file.data, { contentType, upsert: true })

      totalSize += file.data.byteLength
    }

    // Step 5: Get public URL of the main model file
    const mainPath = `${baseDir}/${mainFile.name}`
    const { data: urlData } = supabase.storage.from('3d-models').getPublicUrl(mainPath)

    // Step 6: Track the upload
    await supabase.from('model_uploads').insert({
      user_id: user.id,
      file_name: safeName,
      storage_path: baseDir,
      file_size: totalSize,
      source: 'sketchfab',
    })

    return NextResponse.json({ url: urlData.publicUrl, name: safeName })
  } catch (err) {
    console.error('Sketchfab import error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

/**
 * Extract ALL files from a ZIP archive.
 * Supports stored (compMethod=0) and deflate (compMethod=8) entries.
 * Skips directories and zero-byte files.
 */
function extractAllFromZip(zip: Uint8Array): ZipEntry[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  let offset = 0
  const entries: ZipEntry[] = []

  while (offset < zip.length - 4) {
    if (view.getUint32(offset, true) !== 0x04034b50) break

    const compMethod = view.getUint16(offset + 8, true)
    const compSize = view.getUint32(offset + 18, true)
    const nameLen = view.getUint16(offset + 26, true)
    const extraLen = view.getUint16(offset + 28, true)
    const fileName = new TextDecoder().decode(zip.slice(offset + 30, offset + 30 + nameLen))
    const dataStart = offset + 30 + nameLen + extraLen

    // Skip directories and empty files
    if (!fileName.endsWith('/') && compSize > 0) {
      const compressedData = zip.slice(dataStart, dataStart + compSize)
      let fileData: Uint8Array | null = null

      if (compMethod === 0) {
        fileData = compressedData
      } else if (compMethod === 8) {
        try {
          fileData = new Uint8Array(inflateRawSync(Buffer.from(compressedData)))
        } catch {
          // Skip files that fail to decompress
        }
      }

      if (fileData) {
        entries.push({ name: fileName, data: fileData })
      }
    }

    offset = dataStart + compSize
  }

  return entries
}
