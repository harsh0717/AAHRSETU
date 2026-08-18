/** @type {import('next').NextConfig} */

// In production (Vercel), NEXT_PUBLIC_API_URL points to your Render backend.
// e.g. https://aharsetu-api.onrender.com
// In local dev, requests are proxied to 127.0.0.1:8000.
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') // strip trailing slash
  : 'http://127.0.0.1:8000';

const nextConfig = {
  trailingSlash: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_BASE}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_BASE}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
