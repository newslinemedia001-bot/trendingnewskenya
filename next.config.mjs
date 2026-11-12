/** @type {import('next').NextConfig} */
const nextConfig = {
  // Public pages use ISR; routes that need a live database opt out with
  // `dynamic = 'force-dynamic'`.
  cacheComponents: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Lead images live in this project's Supabase Storage bucket.
      ...supabasePatterns(),
      // Older stories may still point at Firebase Storage or a Google CDN.
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      // Articles can be filed with an image hosted by any publisher.
      { protocol: 'https', hostname: '**' },
    ],
  },
}

/** The Supabase project's public storage host, when one is configured. */
function supabasePatterns() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return []
  try {
    return [
      {
        protocol: 'https',
        hostname: new URL(url).hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
}

export default nextConfig
