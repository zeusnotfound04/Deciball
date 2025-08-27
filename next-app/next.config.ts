const nextConfig = {
  images: {
    domains: [
      'i.ytimg.com', 
      'i.scdn.co',
      'deciball-web-storage.s3.ap-south-1.amazonaws.com',
      'wsrv.nl',
      'lh3.googleusercontent.com'
    ], 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
