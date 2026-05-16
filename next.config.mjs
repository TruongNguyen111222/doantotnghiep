 /** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/admin/phe-duyet",
        destination: "/admin/quan-ly-doanh-nghiep?status=PENDING",
        permanent: false
      },
      {
        source: "/admin/phe-duyet/:path*",
        destination: "/admin/quan-ly-doanh-nghiep?status=PENDING",
        permanent: false
      }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "45mb"
    }
  }
};

export default nextConfig;
