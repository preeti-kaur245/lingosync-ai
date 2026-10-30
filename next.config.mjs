/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'lingosync-ai';

const nextConfig = {
  output: 'export',
  // GitHub Pages serves project repositories at https://<username>.github.io/<repo-name>/
  basePath: process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : (isProd ? `/${repoName}` : ''),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

