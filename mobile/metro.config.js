const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-runtime') {
    return {
      type: 'sourceFile',
      filePath: path.join(
        __dirname,
        'node_modules',
        '@expo',
        'metro-runtime',
        'src',
        'index.ts'
      ),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
