import { vol } from 'memfs';

import { androidCommandHandler } from '../src/android';

import { expectFileContents } from './test-utils/expectFileContents';

const MANIFEST_PACKAGE_NAME = 'com.myawesomeoldapp';
const PROJECT_FILE_PATH = '/path/to/project';
const ANDROID_APPLICATION_MANIFEST_FILE = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
        package="${MANIFEST_PACKAGE_NAME}">
  <application>
  </application>
</manifest>
`;

jest.mock('fs');

const manifestPath = `${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`;
const pluginName = 'XyzFrameProcessor';
const methodName = 'xyz';

beforeEach(() => {
  const JSONFileSystem = {
    [`${PROJECT_FILE_PATH}/android/app/src/main/AndroidManifest.xml`]: ANDROID_APPLICATION_MANIFEST_FILE,
    [`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/MainActivity.java`]: '',
    [`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/MainApplication.java`]: '',
  };

  vol.fromJSON(JSONFileSystem);
});

afterEach(() => {
  vol.reset();
});

describe('android', () => {
  test('should create Kotlin plugin boilerplate', async () => {
    await androidCommandHandler({
      '$0': 'vision-camera-plugin-builder',
      '_': [ 'android' ],
      'manifestPath': manifestPath,
      'manifest-path': manifestPath,
      'pluginName': pluginName,
      'plugin-name': pluginName,
      'methodName': methodName,
      'method-name': methodName,
      'lang': 'Kotlin',
    });

    // XyzFrameProcessorPlugin.kt
    const pluginFile = vol.readFileSync(`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/${pluginName.toLowerCase()}/${pluginName}Plugin.kt`, { encoding: 'utf-8' });

    expectFileContents(pluginFile, [
      'import com.mrousavy.camera.frameprocessors.Frame',
      'import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin',
      'import com.mrousavy.camera.frameprocessors.VisionCameraProxy',
      `class ${pluginName}Plugin(proxy: VisionCameraProxy, options: Map<String, Any>?): FrameProcessorPlugin()`,
      'override fun callback(frame: Frame, arguments: Map<String, Any>?): Any?',
    ]);

    // XyzFrameProcessorPluginPackage.kt
    const pluginPackageFile = vol.readFileSync(`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/${pluginName.toLowerCase()}/${pluginName}PluginPackage.kt`, { encoding: 'utf-8' });

    expectFileContents(pluginPackageFile, [
      'import com.facebook.react.ReactPackage',
      'import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry',
      `class ${pluginName}PluginPackage : ReactPackage`,
      new RegExp(`FrameProcessorPluginRegistry.addFrameProcessorPlugin\\("${methodName}"\\) { proxy, options ->\\s+${pluginName}Plugin\\(proxy, options\\)\\s+}`),
    ]);
  });
  test('should create Java plugin boilerplate', async () => {
    await androidCommandHandler({
      '$0': 'vision-camera-plugin-builder',
      '_': [ 'android' ],
      'manifestPath': manifestPath,
      'manifest-path': manifestPath,
      'pluginName': pluginName,
      'plugin-name': pluginName,
      'methodName': methodName,
      'method-name': methodName,
      'lang': 'java',
    });

    // XyzFrameProcessorPlugin.java
    const pluginFile = vol.readFileSync(`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/${pluginName.toLowerCase()}/${pluginName}Plugin.java`, { encoding: 'utf-8' });

    expectFileContents(pluginFile, [
      'import androidx.annotation.NonNull;',
      'import androidx.annotation.Nullable;',
      'import java.util.Map;',
      'import com.mrousavy.camera.frameprocessors.Frame;',
      'import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin;',
      'import com.mrousavy.camera.frameprocessors.VisionCameraProxy;',
      `public class ${pluginName}Plugin extends FrameProcessorPlugin`,
      new RegExp(`public ${pluginName}Plugin\\(\\@NonNull VisionCameraProxy proxy, \\@Nullable Map<String, Object> options\\) {\\s+super\\(\\);\\s+}`),
      new RegExp('\\@Nullable\\s+\\@Override\\s+public Object callback\\(\\@NonNull Frame frame, \\@Nullable Map<String, Object> arguments\\)'),
    ]);

    // XyzFrameProcessorPluginPackage.java
    const pluginPackageFile = vol.readFileSync(`${PROJECT_FILE_PATH}/android/app/src/main/java/com/myawesomeoldapp/${pluginName.toLowerCase()}/${pluginName}PluginPackage.java`, { encoding: 'utf-8' });

    expectFileContents(pluginPackageFile, [
      'import com.facebook.react.ReactPackage;',
      'import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry;',
      `public class ${pluginName}PluginPackage implements ReactPackage`,
      new RegExp(`FrameProcessorPluginRegistry.addFrameProcessorPlugin\\(\\s+"${methodName}",\\s+\\(proxy, options\\) -> new ${pluginName}Plugin\\(proxy, options\\)\\s+\\);`),
    ]);
  });
});
