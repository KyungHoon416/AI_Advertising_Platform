/** @type {import('next').NextConfig} */
const API_TARGET = process.env.API_TARGET || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    // Same-origin proxy so the browser never hits CORS in dev.
    return [{ source: "/api/:path*", destination: `${API_TARGET}/api/:path*` }];
  },
};

export default nextConfig;
