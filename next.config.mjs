/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['xlsx', 'cheerio']
};

export default nextConfig;
