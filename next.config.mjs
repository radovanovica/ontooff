/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mui/icons-material', '@mui/material', '@mui/system', '@mui/lab'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
