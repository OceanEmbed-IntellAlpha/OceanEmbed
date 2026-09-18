/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing Cesium JS files
  transpilePackages: ['cesium', 'resium'],

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Tell webpack where Cesium's base URL is (served from public/cesium)
      config.plugins.push(
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify('/cesium'),
        })
      );

      // Copy Cesium static assets to public on build
      try {
        const CopyWebpackPlugin = require('copy-webpack-plugin');
        const cesiumSource = 'node_modules/cesium/Build/Cesium';
        config.plugins.push(
          new CopyWebpackPlugin({
            patterns: [
              { from: `${cesiumSource}/Workers`, to: '../public/cesium/Workers', info: { minimized: true } },
              { from: `${cesiumSource}/ThirdParty`, to: '../public/cesium/ThirdParty', info: { minimized: true } },
              { from: `${cesiumSource}/Assets`, to: '../public/cesium/Assets', info: { minimized: true } },
              { from: `${cesiumSource}/Widgets`, to: '../public/cesium/Widgets', info: { minimized: true } },
            ],
          })
        );
      } catch {
        console.warn('[next.config] copy-webpack-plugin not found — Cesium assets may need manual copy');
      }

      // Cesium uses some node built-ins in browser context
      config.resolve.fallback = {
        ...config.resolve.fallback,
        https: false,
        zlib: false,
        http: false,
        url: false,
        path: false,
        fs: false,
      };
    }

    // Ignore Cesium's node-specific warnings
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/cesium/,
      use: {
        loader: 'babel-loader',
        options: {
          compact: false,
          presets: [],
        },
      },
    });

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tile.openstreetmap.org' },
      { protocol: 'https', hostname: '*.cesium.com' },
      { protocol: 'https', hostname: 'cesium.com' },
    ],
  },
};

module.exports = nextConfig;
