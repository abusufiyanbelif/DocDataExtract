/** @type {import('next').NextConfig} */
const nextConfig = {
    // Force cache clear
    experimental: {},
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
        ],
    },
};

module.exports = nextConfig;
