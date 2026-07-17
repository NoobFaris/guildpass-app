/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@guildpass/integration-client",
    "@guildpass/webhook-utils",
  ],
};

export default nextConfig;
