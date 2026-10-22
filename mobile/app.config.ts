import type { ExpoConfig } from '@expo/config-types';
import appJson from './app.json';

interface NodeFs {
  existsSync(filePath: string): boolean;
}

interface NodePath {
  join(...parts: string[]): string;
}

declare const require: {
  (moduleName: 'fs'): NodeFs;
  (moduleName: 'path'): NodePath;
};

declare const __dirname: string;

const fs = require('fs');
const path = require('path');

const ios: Record<string, unknown> = { ...appJson.expo.ios };
const android: Record<string, unknown> = { ...appJson.expo.android };

if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
  android.googleServicesFile = './google-services.json';
}

if (fs.existsSync(path.join(__dirname, 'GoogleService-Info.plist'))) {
  ios.googleServicesFile = './GoogleService-Info.plist';
}

const config = {
  ...appJson.expo,
  ios,
  android,
} as ExpoConfig;

export default config;
