module.exports = {
  reactStrictMode: true,
  // 静的ファイルの配信設定
  async rewrites() {
    return [
      {
        source: '/css/:path*',
        destination: '/app/sightseeing/css/:path*',
      },
      {
        source: '/json/:path*',
        destination: '/app/sightseeing/json/:path*',
      },
      {
        source: '/pic/:path*',
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
};