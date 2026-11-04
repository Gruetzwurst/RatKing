// Runs on GitHub Actions after Capacitor generated android/.
// The keystore and passwords are provided via encrypted repository secrets.
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const required = [
  'RATKING_KEYSTORE_PATH',
  'RATKING_KEYSTORE_PASSWORD',
  'RATKING_KEY_ALIAS'
];
for (const name of required) {
  if (!process.env[name]) throw new Error('Required signing secret missing: ' + name);
}
const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
const gradle = await readFile(gradlePath, 'utf8');
if (!gradle.includes('com.android.application') || !gradle.includes('android {')) {
  throw new Error('Unexpected Android Gradle project structure');
}
const versionCode = Number(process.env.GITHUB_RUN_NUMBER || '1') + 1;
if (!Number.isSafeInteger(versionCode) || versionCode < 1) throw new Error('Invalid version code');
// This appends a second Android configuration block using the same Gradle extension.
const extra = [
  '',
  '// RatKing stable release signing (credentials supplied by GitHub Actions secrets)',
  'android {',
  '    signingConfigs {',
  '        ratkingRelease {',
  '            storeFile file(System.getenv("RATKING_KEYSTORE_PATH"))',
  '            storePassword System.getenv("RATKING_KEYSTORE_PASSWORD")',
  '            keyAlias System.getenv("RATKING_KEY_ALIAS")',
  '            keyPassword System.getenv("RATKING_KEYSTORE_PASSWORD")',
  '        }',
  '    }',
  '    buildTypes {',
  '        release {',
  '            signingConfig signingConfigs.ratkingRelease',
  '        }',
  '    }',
  '    defaultConfig {',
  '        versionCode ' + versionCode,
  '        versionName "0.10.14"',
  '    }',
  '}',
  ''
].join('\n');
await appendFile(gradlePath, extra);
console.log('RatKing release signing configuration added; versionCode ' + versionCode);
