const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Node.js polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-crypto',
  stream: 'readable-stream',
  buffer: '@craftzdog/react-native-buffer',
  process: 'process/browser',
};

// Ensure polyfills are resolved properly
config.resolver.platforms = ['native', 'ios', 'android', 'web'];

module.exports = config;
