import fs from 'fs';
import path from 'path';

import glob from 'glob';
import kleur from 'kleur';
import type { Ora } from 'ora';

const ANDROID_GLOB_OPTIONS = {
  absolute: true,
  ignore: [
    'node_modules/**',
    '**/build/**',
    '**/debug/**',
  ],
  nocase: true,
  nodir: false,
};

const NAMESPACE_VALUE_REGEX = /namespace (= ){0,1}("|')([A-Za-z]{1}[A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*("|')/;
const PACKAGE_NAME_REGEX = /([A-Za-z]{1}[A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*/;
const PACKAGE_ATTRIBUTE_REGEX = /package="(.+?)"/;

/**
 * Determines if the manifest describes application package
 */
export const isManifestForApplication = (manifestPath: string) => {
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const isApplicationMatchArray = manifestContent.match(/<application/);

  return !!isApplicationMatchArray && isApplicationMatchArray.length > 0;
};

/**
 * It will try to extract the namespace value from build.gradle scripts
 * or will fall back to package attribute from android manifest
 */
export const extractPackageName = (workingDir: string, manifestPath: string) => {
 const groovyGradleResults = glob.sync('**/build.gradle', {
   cwd: workingDir,
   ...ANDROID_GLOB_OPTIONS,
 });
 const kotlinGradleResults = glob.sync('**/build.gradle.kts', {
   cwd: workingDir,
   ...ANDROID_GLOB_OPTIONS,
 });
 const results = [ ...groovyGradleResults, ...kotlinGradleResults ];

 for (const gradleScriptPath of results) {
   const gradleScriptContent = fs.readFileSync(gradleScriptPath, { encoding: 'utf-8' });

   const namespaceResults = gradleScriptContent.match(NAMESPACE_VALUE_REGEX);

   if (namespaceResults?.[0]) {
     const packageNameResults = namespaceResults[0].match(PACKAGE_NAME_REGEX);

     if (packageNameResults?.[0]) {
       return packageNameResults[0];
     }
   }
 }

 const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
 const packageNameMatchArray = manifestContent.match(PACKAGE_ATTRIBUTE_REGEX);

 if (!packageNameMatchArray || packageNameMatchArray.length < 2) {
   return undefined;
 }

 return packageNameMatchArray[1] as string;
};

export const displayExtractPackageNameErrorMessage = () => {
  console.error(kleur.red(`
Cannot extract package from gradle scripts or manifest

Make sure either:
1. your application/library's "build.gradle" file has "namespace" value assigned e.g.

android {
  ndkVersion rootProject.ext.ndkVersion

  compileSdkVersion rootProject.ext.compileSdkVersion

  // in Groovy build.gradle you can use single or double quoted strings
  namespace "com.myawesomeapp" // <--- add this
  // namespace 'com.myawesomeapp' // <--- or this

  // in Kotlin build.gradle.kts you must use double quotes string and "=" char
  // namespace = "com.myawesomeapp" // <--- add this

  // ...
}

2. your application/library's "AndroidManifest.xml" has a package attribute assigned e.g.

<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          package="com.myawesomeapp"> // <--- add this


</manifest>
`));
};

/**
 * Helper that suggests absolute path to project's/library's android manifest file
 */
export const suggestAndroidManifest = (workingDir: string): string | undefined => {
  const [ manifestFile ] = glob.sync(path.join('**', 'AndroidManifest.xml'), {
    cwd: workingDir,
    ...ANDROID_GLOB_OPTIONS,
  });

  return manifestFile;
};

/**
 * Helper that returns a content for plugin's implementation file based on the chosen language
 */
const preparePluginFile = (lang: 'Kotlin' | 'Java', packageName: string, pluginName: string) => {
  const kotlinPluginContent = `
package ${packageName}.${pluginName.toLowerCase()}

import com.mrousavy.camera.frameprocessor.Frame
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessor.VisionCameraProxy

class ${pluginName}Plugin(proxy: VisionCameraProxy, options: Map<String, Any>?): FrameProcessorPlugin() {
  override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
    // code goes here
    return null
  }
}
`.trim();
  const javaPluginContent = `
package ${packageName}.${pluginName.toLowerCase()};

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.mrousavy.camera.frameprocessor.Frame;
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;
import java.util.Map;

public class ${pluginName}Plugin extends FrameProcessorPlugin {
  public ${pluginName}Plugin(@NonNull VisionCameraProxy proxy, @Nullable Map<String, Object> options) {
    super(proxy, options);
  }

  @Nullable
  @Override
  public Object callback(@NonNull Frame frame, @Nullable Map<String, Object> arguments) {
    // code goes here
    return null;
  }
}
`.trim();

  return lang === 'Kotlin' ? kotlinPluginContent : javaPluginContent;
};

/**
 * Helper that returns a content for plugin's react package file based on the chosen language
 */
const preparePluginPackageFile = (lang: 'Kotlin' | 'Java', packageName: string, pluginName: string, methodName: string, isApplicationPackage: boolean) => {
  const kotlinPluginPackageContent = `
package ${packageName}${isApplicationPackage ? '.' + pluginName.toLowerCase() : ''}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mrousavy.camera.frameprocessor.FrameProcessorPluginRegistry
${isApplicationPackage ? '' : `import ${packageName}.${pluginName.toLowerCase()}.${pluginName}Plugin\n`}
class ${pluginName}PluginPackage : ReactPackage {
  companion object {
    init {
      FrameProcessorPluginRegistry.addFrameProcessorPlugin("${methodName}") { proxy, options ->
        ${pluginName}Plugin(proxy, options)
      }
    }
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`.trim();

  const javaPluginPackageContent = `
package ${packageName}${isApplicationPackage ? '.' + pluginName.toLowerCase() : ''};

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.mrousavy.camera.frameprocessor.FrameProcessorPluginRegistry;
${isApplicationPackage ? '' : `import ${packageName}.${pluginName.toLowerCase()}.${pluginName}Plugin;\n`}
import java.util.Collections;
import java.util.List;

public class ${pluginName}PluginPackage implements ReactPackage {
  static {
    FrameProcessorPluginRegistry.addFrameProcessorPlugin(
            "${methodName}",
            (proxy, options) -> new ${pluginName}Plugin(proxy, options)
    );
  }

  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`.trim();

  return lang === 'Kotlin' ? kotlinPluginPackageContent : javaPluginPackageContent;
};

/**
 * Helper that returns path to the MainApplication.java/MainActivity.java directory
 */
export const getSourceSetDirectory = (manifestPath: string, packageName: string) => {
  const packageElements = packageName.split('.');

  let sourceDir = path.join(path.dirname(manifestPath), 'java', ...packageElements);
  if (!fs.existsSync(sourceDir)) {
    // Handle project with kotlin source set
    sourceDir = path.join(path.dirname(manifestPath), 'kotlin', ...packageElements);
    if (!fs.existsSync(sourceDir)) {
      return undefined;
    }
  }

  return sourceDir;
};

/**
 * Helper that creates a directory for plugin's code inside a source set directory
 */
export const createAndroidPluginDirectory = (sourceDir: string, pluginName: string) => {
  const pluginDirectoryPath = path.join(sourceDir, pluginName.toLowerCase());

  if (!fs.existsSync(pluginDirectoryPath)) {
    fs.mkdirSync(pluginDirectoryPath);
  }
};

export const createPluginFile = (
  sourceDir: string,
  packageName: string,
  pluginName: string,
  lang: 'Kotlin' | 'Java',
  spinner: Ora,
) => {
  const ext = lang === 'Kotlin' ? '.kt' : '.java';
  const pluginFilename = pluginName + 'Plugin' + ext;
  const pluginFilepath = path.join(sourceDir, pluginName.toLowerCase(), pluginFilename);
  const pluginContent = preparePluginFile(lang, packageName, pluginName);

  spinner.text = `Generating ${pluginFilename}`;
  spinner.start();

  if (!fs.existsSync(pluginFilepath)) {
    fs.writeFileSync(pluginFilepath, pluginContent, 'utf-8');
  }

  spinner.succeed();
};

export const createPluginPackageFile = (
  sourceDir: string,
  manifestPath: string,
  packageName: string,
  pluginName: string,
  methodName: string,
  lang: 'Kotlin' | 'Java',
  spinner: Ora,
) => {
  const ext = lang === 'Kotlin' ? '.kt' : '.java';
  const isApplicationPackage = isManifestForApplication(manifestPath);
  const pluginPackageFilename = pluginName + 'PluginPackage' + ext;
  const pluginPackageFilepath = path.join(sourceDir, isApplicationPackage ? pluginName.toLowerCase() : '', pluginPackageFilename);

  spinner.text = `Generating ${pluginPackageFilename}`;
  spinner.start();

  const pluginPackageContent = preparePluginPackageFile(
    lang,
    packageName,
    pluginName,
    methodName,
    isApplicationPackage,
  );

  if (!fs.existsSync(pluginPackageFilepath)) {
    fs.writeFileSync(pluginPackageFilepath, pluginPackageContent, 'utf-8');
  }

  spinner.succeed();
};

const displayFinishStepsForAndroidApplicationPlugin = (pluginName: string) => {
  console.log(kleur.gray(`${kleur.yellow(`Finish Android setup with registering ${pluginName + 'PluginPackage'}
in getPackages method, in your MainApplication.(java|kt)`)}
// MainApplication.(java|kt)
@Override
protected List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // ...
  ${kleur.green(`packages.add(new ${pluginName + 'PluginPackage'}()); // <--- add this`)}
  return packages;
}`.trim()));
};

const displayFinishStepsForAndroidLibraryPlugin = () => {
  console.log(kleur.gray(`${kleur.yellow(`Finish setup for your Android library
with adding "VisionCamera" dependency in your library's "build.gradle" file:`)}
// build.gradle
apply plugin: 'com.android.library'

// ...

dependencies {
    implementation 'com.facebook.react:react-native:+' // From node_modules
    ${kleur.green('api project(":react-native-vision-camera") // <--- add this')}
}`.trim()));
};

export const printFinishSetupForAndroid = (manifestPath: string, pluginName: string) => {
  if (isManifestForApplication(manifestPath)) {
    displayFinishStepsForAndroidApplicationPlugin(pluginName);
  } else {
    displayFinishStepsForAndroidLibraryPlugin();
  }

  console.log('\n');
};
