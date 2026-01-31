/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['handlebars', 'genkit', '@genkit-ai/google-genai', '@genkit-ai/next', 'firebase-admin'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

module.exports = nextConfig;
