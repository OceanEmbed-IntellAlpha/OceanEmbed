/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['gsap', '@gsap/react'],
  serverExternalPackages: ['is-sea'],
};

export default nextConfig;
