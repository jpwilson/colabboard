import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_UPLOADS_PER_USER = 10
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/** Upload a user's own GLB/GLTF file */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check upload limit
  const { count } = await supabase
    .from('model_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_UPLOADS_PER_USER) {
    return NextResponse.json(
      { error: `Upload limit reached (${MAX_UPLOADS_PER_USER} models max). Delete existing models to upload more.` },
      { status: 429 },
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['glb', 'gltf'].includes(ext)) {
    return NextResponse.json({ error: 'Only .glb and .gltf files are accepted' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (50MB max)' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const storagePath = `${user.id}/${Date.now()}_${safeName}`

  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('3d-models')
    .upload(storagePath, buffer, {
      contentType: ext === 'glb' ? 'model/gltf-binary' : 'model/gltf+json',
      upsert: false,
    })
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('3d-models').getPublicUrl(storagePath)

  // Track the upload
  await supabase.from('model_uploads').insert({
    user_id: user.id,
    file_name: safeName,
    storage_path: storagePath,
    file_size: file.size,
    source: 'upload',
  })

  return NextResponse.json({ url: urlData.publicUrl, name: safeName })
}

/** List user's uploads */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, count } = await supabase
    .from('model_uploads')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ uploads: data || [], count: count ?? 0, limit: MAX_UPLOADS_PER_USER })
}

/** Delete a user's upload */
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, storage_path } = (await request.json()) as { id?: string; storage_path?: string }
  if (!id || !storage_path) {
    return NextResponse.json({ error: 'id and storage_path required' }, { status: 400 })
  }

  // Delete from storage — handle both single files and directories (Sketchfab imports)
  const { data: files } = await supabase.storage.from('3d-models').list(storage_path)
  if (files && files.length > 0) {
    // It's a directory — delete all files inside it
    const paths = files.map((f) => `${storage_path}/${f.name}`)
    await supabase.storage.from('3d-models').remove(paths)
  } else {
    // Single file
    await supabase.storage.from('3d-models').remove([storage_path])
  }
  // Delete tracking record (RLS ensures user can only delete own)
  await supabase.from('model_uploads').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
