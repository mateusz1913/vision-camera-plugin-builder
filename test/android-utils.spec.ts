import { vol } from 'memfs';

import {
  createAndroidPluginDirectory,
  extractPackageName,
  getSourceSetDirectory,
  isManifestForApplication,
  suggestAndroidManifest,
} from '../src/android-utils';

const NAMESPACE_PACKAGE_NAME = 'com.myawesomeapp';
const MANIFEST_PACKAGE_NAME = 'com.myawesomeoldapp';
const PROJECT_FILE_PATH = '/path/to/project';
const BUILD_GRADLE_FILE = `
android {
    ndkVersion rootProject.ext.ndkVersion

    compileSdk rootProject.ext.compileSdkVersion

    namespace "${NAMESPACE_PACKAGE_NAME}"
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

  namespace = "${NAMESPACE_PACKAGE_NAME}"

  defaultConfig {
      minSdk = safeExtGet("minSdkVersion", 21) as Int?
      targetSdk = safeExtGet("targetSdkVersion", 33) as Int?
      buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", isNewArchitectureEnabled().toString())
  }
}
`;
const ANDROID_MANIFEST_FILE = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
        package="${MANIFEST_PACKAGE_NAME}">

</manifest>
`;

const ANDROID_APPLICATION_MANIFEST_FILE = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
        package="${MANIFEST_PACKAGE_NAME}">
  <application>
  </application>
</manifest>
`;

jest.mock('fs');

beforeEach(() => {
  vol.reset();
});

describe('createAndroidPluginDirectory', () => {
  test('should create directory for android plugin source code', () => {
    const JSONFileSystem = {
      [`${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`]: ANDROID_APPLICATION_MANIFEST_FILE,
      [`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/MainActivity.java`]: '',
      [`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/MainApplication.java`]: '',
    };

    vol.fromJSON(JSONFileSystem);
    const pluginName = 'XyzFrameProcessorPlugin';

    createAndroidPluginDirectory(`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp`, pluginName);

    expect(vol.toJSON()).toEqual({
      ...JSONFileSystem,
      [`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/${pluginName.toLowerCase()}`]: null,
    });
  });
});

describe('extractPackageName', () => {
  test('should retrieve package name from namespace value in build.gradle', () => {
    vol.fromNestedJSON({
      android: {
        app: {
          'build.gradle': BUILD_GRADLE_FILE,
        },
      },
    }, PROJECT_FILE_PATH);

    expect(
      extractPackageName(
        `${PROJECT_FILE_PATH}/android/app`,
        `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`
      )
    ).toBe(NAMESPACE_PACKAGE_NAME);
  });
  test('should retrieve package name from namespace value in build.gradle.kts', () => {
    vol.fromNestedJSON({
      android: {
        app: {
          'build.gradle.kts': BUILD_GRADLE_KTS_FILE,
        },
      },
    }, PROJECT_FILE_PATH);
    expect(
      extractPackageName(
        `${PROJECT_FILE_PATH}/android/app`,
        `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`
      )
    ).toBe(NAMESPACE_PACKAGE_NAME);
  });
  test('should retrieve package name from package attribute in AndroidManifest.xml', () => {
    vol.fromNestedJSON({
      android: {
        app: {
          src: {
            main: {
              'AndroidManifest.xml': ANDROID_MANIFEST_FILE,
            },
          },
        },
      },
    }, PROJECT_FILE_PATH);
    expect(extractPackageName(`${PROJECT_FILE_PATH}/android/app`, `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`)).toBe(MANIFEST_PACKAGE_NAME);
  });
});

describe('getSourceSetDirectory', () => {
  test('should retrieve path to Java source code for provided manifest path and package name', () => {
    vol.fromNestedJSON({
      android: {
        app: {
          src: {
            main: {
              'java': {
                com: {
                  myawesomeoldapp: {
                    'MainActivity.java': '',
                    'MainApplication.java': '',
                  },
                },
              },
              'AndroidManifest.xml': ANDROID_APPLICATION_MANIFEST_FILE,
            },
          },
        },
      },
    }, PROJECT_FILE_PATH);
    expect(getSourceSetDirectory(`${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`, MANIFEST_PACKAGE_NAME)).toBe(`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp`);
  });
});

describe('isManifestForApplication', () => {
  test('should check if provided manifest is an android application manifest', () => {
    vol.fromNestedJSON({
      android: {
        app: {
          src: {
            debug: {
              'AndroidManifest.xml': ANDROID_MANIFEST_FILE,
            },
            main: {
              'AndroidManifest.xml': ANDROID_APPLICATION_MANIFEST_FILE,
            },
          },
        },
      },
    }, PROJECT_FILE_PATH);
    expect(isManifestForApplication(`${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`)).toBeTruthy();
    expect(isManifestForApplication(`${PROJECT_FILE_PATH}/android/app/src/debug/AndroidManifest.xml`)).toBeFalsy();
  });
});

describe('suggestAndroidManifest', () => {
  test('should suggest path to Android Manifest for given working directory', () => {
    vol.fromNestedJSON({
      android: {
        app: {
          src: {
            main: {
              'AndroidManifest.xml': ANDROID_MANIFEST_FILE,
            },
          },
        },
      },
    }, PROJECT_FILE_PATH);
    expect(suggestAndroidManifest(PROJECT_FILE_PATH)).toBe(`${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`);
  });
});
