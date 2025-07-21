const nextConfig = {
  images: {
    domains: ['i.ytimg.com', 'i.scdn.co'], 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
