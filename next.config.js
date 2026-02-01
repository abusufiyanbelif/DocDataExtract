/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
        ],
    },
    devIndicators: {
        allowedDevOrigins: [
            'https://9000-firebase-studio-1757160189526.cluster-edb2jv34dnhjisxuq5m7l37ccy.cloudworkstations.dev'
        ],
    },
};

module.exports = nextConfig;
