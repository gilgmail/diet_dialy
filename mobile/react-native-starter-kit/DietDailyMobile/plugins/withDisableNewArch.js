const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to force RCTNewArchEnabled to false in Info.plist
 * This is required for react-native-health compatibility
 */
const withDisableNewArch = (config) => {
  return withInfoPlist(config, (config) => {
    // Force RCTNewArchEnabled to false
    config.modResults.RCTNewArchEnabled = false;
    return config;
  });
};

module.exports = withDisableNewArch;
