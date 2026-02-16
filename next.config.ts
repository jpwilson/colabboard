import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: './src/lib/empty.ts',
    },
  },
}

export default nextConfig
