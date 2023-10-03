import { afterEach, describe, expect, test } from '@jest/globals';
import mockFS from 'mock-fs';

import { extractPackageName } from '../src/android-utils';

const PACKAGE_NAME = 'com.myawesomeapp';
const PROJECT_FILE_PATH = '/path/to/project';
const BUILD_GRADLE_FILE = `
android {
    ndkVersion rootProject.ext.ndkVersion

    compileSdk rootProject.ext.compileSdkVersion

    namespace "${PACKAGE_NAME}"
    defaultConfig {
        applicationId "com.helloworld"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
}
`;
const BUILD_GRADLE_KTS_FILE = `
android {
  val safeExtGet: (prop: String, fallback: Any) -> Any? by project.extra

  compileSdk = safeExtGet("compileSdkVersion", 33) as Int?

  namespace = "${PACKAGE_NAME}"

  defaultConfig {
      minSdk = safeExtGet("minSdkVersion", 21) as Int?
      targetSdk = safeExtGet("targetSdkVersion", 33) as Int?
      buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", isNewArchitectureEnabled().toString())
  }
}
`;
const ANDROID_MANIFEST_FILE = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
        package="${PACKAGE_NAME}">

</manifest>
`;

afterEach(() => {
  mockFS.restore();
});

describe('extractPackageName', () => {
  test('should retrieve package name from namespace value in build.gradle', () => {
    mockFS({
      [PROJECT_FILE_PATH]: {
        android: {
          app: {
            'build.gradle': BUILD_GRADLE_FILE,
          },
        },
      },
    });
    expect(
      extractPackageName(
        `${PROJECT_FILE_PATH}/android/app`,
        `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`
      )
    ).toBe(PACKAGE_NAME);
  });
  test('should retrieve package name from namespace value in build.gradle.kts', () => {
    mockFS({
      [PROJECT_FILE_PATH]: {
        android: {
          app: {
            'build.gradle.kts': BUILD_GRADLE_KTS_FILE,
          },
        },
      },
    });
    expect(
      extractPackageName(
        `${PROJECT_FILE_PATH}/android/app`,
        `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`
      )
    ).toBe(PACKAGE_NAME);
  });
  test('should retrieve package name from package attribute in AndroidManifest.xml', () => {
    mockFS({
      [PROJECT_FILE_PATH]: {
        android: {
          app: {
            src: {
              main: {
                'AndroidManifest.xml': ANDROID_MANIFEST_FILE,
              },
            },
          },
        },
      },
    });
    extractPackageName(`${PROJECT_FILE_PATH}/android/app`, `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`);
  });
});
