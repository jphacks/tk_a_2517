module.exports = {
  reactStrictMode: true,
  // 開発環境での警告を抑制
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Vercel向けの設定
  output: 'standalone',
  // 静的ファイルの配信設定
  async rewrites() {
    return [
      // Sightseeing rewrites
      {
        source: '/css/sightseeing/:path*',
        destination: '/app/sightseeing/css/:path*',
      },
      {
        source: '/json/sightseeing/:path*',
        destination: '/app/sightseeing/json/:path*',
      },
      {
        source: '/pic/sightseeing/:path*',
        destination: '/app/sightseeing/pic/:path*',
      },
    ];
  },
  // 開発環境での警告を抑制
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // 開発環境でのコンソール警告を抑制
  webpack: (config, { dev, isServer }) => {
    // ブラウザ向けバンドルでは Node コアを無効化
    if (!isServer) {
      if (dev) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          stream: false,
          util: false,
          buffer: false,
          process: false,
        };
      }
      config.resolve.alias = {
        ...config.resolve.alias,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  // experimental 設定は使用しない（Vercel推奨）
};