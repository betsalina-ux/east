/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@deriv/core'],
  output: 'standalone',
}

module.exports = nextConfig
