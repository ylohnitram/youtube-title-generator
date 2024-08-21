// next.config.js

module.exports = {
  experimental: {
    esmExternals: false
  },
  webpack: (config) => {
    config.externals.push('@sparticuz/chromium', 'puppeteer-core');
    return config;
  },
};
