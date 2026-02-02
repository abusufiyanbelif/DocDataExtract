/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // This is required to allow the Next.js dev server to be accessed from
        // the Firebase Studio environment.
        allowedDevOrigins: ["https://*.cloudworkstations.dev"],
    },
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
