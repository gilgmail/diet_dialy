// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure Metro to resolve symbolic links
// This allows Metro to properly resolve modules through symlinks
// DietDailyDev uses a symlink: src -> ../DietDailyMobile/src

// Get the actual source directory (resolve symlink)
const srcPath = path.resolve(__dirname, 'src');
let actualSrcPath = srcPath;
try {
  const stats = fs.lstatSync(srcPath);
  if (stats.isSymbolicLink()) {
    actualSrcPath = fs.realpathSync(srcPath);
  }
} catch (e) {
  // If src doesn't exist or can't be resolved, use the symlink target
  actualSrcPath = path.resolve(__dirname, '../DietDailyMobile/src');
}

// Add both the project root and the actual source directory to watchFolders
// This ensures Metro can watch and resolve files through symlinks
config.watchFolders = [
  path.resolve(__dirname),
  actualSrcPath,
  // Also include the parent directory to ensure all related files are watched
  path.resolve(__dirname, '../DietDailyMobile'),
];

// Configure resolver to handle symlinks
config.resolver = {
  ...config.resolver,
  // Enable symlink resolution
  // Metro should handle this automatically, but we ensure it's enabled
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
  },
};

// Ensure transformer can handle symlinks
config.transformer = {
  ...config.transformer,
  // Enable symlink support in transformer
  unstable_allowRequireContext: true,
};

module.exports = config;

