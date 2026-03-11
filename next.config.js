/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'http', hostname: 'www.laplatarugbyclub.com.ar' },
    ],
  },
}

module.exports = nextConfig
