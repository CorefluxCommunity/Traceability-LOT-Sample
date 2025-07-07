const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add polyfills for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "url": require.resolve("url/"),
    "buffer": require.resolve("buffer/"),
    "process": require.resolve("process/browser"),
  };

  // Add plugins
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  return config;
}; 