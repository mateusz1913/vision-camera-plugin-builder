import fs from 'fs';
import path from 'path';

import glob from 'glob';
import kleur from 'kleur';
import type { PromptObject } from 'prompts';
import type { Arguments, Options } from 'yargs';

import { getPromptResponse, printFinishSetup, spinner } from './common';

type AndroidArgName = 'manifestPath' | 'pluginName' | 'methodName' | 'lang';

export const androidArgs: Record<AndroidArgName, Options> = {
  manifestPath: {
    description: 'Path to project\'s Android Manifest file',
    type: 'string',
  },
  pluginName: {
    description: 'Name of the plugin',
    type: 'string',
  },
  methodName: {
    description: 'Name of plugin\'s exported method',
  },
  lang: {
    choices: [ 'Kotlin', 'Java' ],
  },
};

const suggestAndroidManifest = (workingDir: string): string | undefined => {
  const manifestFile = glob.sync(path.join('**', 'AndroidManifest.xml'), {
    cwd: workingDir,
    ignore: [
      'node_modules/**',
      '**/build/**',
      '**/debug/**',
    ],
  })[0];

  if (!manifestFile) {
    return undefined;
  }

  return path.join(workingDir, manifestFile);
};

const createPluginFile = (lang: 'Kotlin' | 'Java', packageName: string, pluginName: string, methodName: string) => {
  const kotlinPluginContent = `
package ${packageName}.${pluginName.toLowerCase()}

import androidx.camera.core.ImageProxy
import com.facebook.react.bridge.WritableNativeArray
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin

class ${pluginName}Plugin: FrameProcessorPlugin("${methodName}") {
  override fun callback(image: ImageProxy, params: Array<Any>): Any? {
    // code goes here
    var array = WritableNativeArray()
    return array
  }
}
`.trim();
  const javaPluginContent = `
package ${packageName}.${pluginName.toLowerCase()};

import androidx.camera.core.ImageProxy;
import com.facebook.react.bridge.WritableNativeArray;
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;

public class ${pluginName}Plugin extends FrameProcessorPlugin {
  @Override
  public Object callback(ImageProxy image, Object[] params) {
    // code goes here
    WritableNativeArray array = new WritableNativeArray();
    return array;
  }

  public ${pluginName}Plugin() {
    super("${methodName}");
  }
}
`.trim();

  return lang === 'Kotlin' ? kotlinPluginContent : javaPluginContent;
};

const createPluginPackageFile = (lang: 'Kotlin' | 'Java', packageName: string, pluginName: string, isApplicationPackage: boolean) => {
  const kotlinPluginPackageContent = `
package ${packageName}${isApplicationPackage ? '.' + pluginName.toLowerCase() : ''}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin
${isApplicationPackage ? '' : `import ${packageName}.${pluginName.toLowerCase()}.${pluginName}Plugin\n`}
class ${pluginName}PluginPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    FrameProcessorPlugin.register(${pluginName}Plugin())
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
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;
${isApplicationPackage ? '' : `import ${packageName}.${pluginName.toLowerCase()}.${pluginName}Plugin;\n`}
import java.util.Collections;
import java.util.List;

public class ${pluginName}PluginPackage implements ReactPackage {
  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
    FrameProcessorPlugin.register(new ${pluginName}Plugin());
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

export async function androidCommandHandler(argv: Arguments<unknown>) {
  const questions: Record<
    AndroidArgName,
    Omit<PromptObject<AndroidArgName>, 'validate'> & { validate?: (value: string) => boolean | string }
  > = {
    manifestPath: {
      type: 'text',
      name: 'manifestPath',
      message: 'What is the (relative) path to project\'s Android Manifest file?',
      initial: suggestAndroidManifest(process.cwd()),
      validate: (input) => fs.existsSync(path.resolve(input)) || 'There is no file at specified path',
    },
    pluginName: {
      type: 'text',
      name: 'pluginName',
      message: 'What is the name of the plugin?',
      initial: 'XyzFrameProcessor',
      validate: (input) => Boolean(input) || 'Plugin name cannot be empty',
    },
    methodName: {
      type: 'text',
      name: 'methodName',
      message: 'What is the name of plugin\'s exported method?',
      initial: 'xyz',
      validate: (input) => Boolean(input) || 'Method name cannot be empty',
    },
    lang: {
      type: 'select',
      name: 'lang',
      message: 'What language do you want to use to develop plugin?',
      choices: [
        {
          title: 'Kotlin',
          value: 'Kotlin',
        },
        {
          title: 'Java',
          value: 'Java',
        },
      ],
    },
  };
  const promptResponse = await getPromptResponse<AndroidArgName, typeof questions>(questions, argv);
  const { lang, methodName, pluginName, manifestPath }: {
    manifestPath: string;
    pluginName: string;
    methodName: string;
    lang: 'Kotlin' | 'Java'
  } = {
    ...argv,
    ...promptResponse,
  };

  console.log(kleur.green(`\nGenerating ${pluginName}\n`));

  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

  const isApplicationMatchArray = manifestContent.match(/<application/);
  const isApplicationPackage = !!isApplicationMatchArray && isApplicationMatchArray.length > 0;
  const packageNameMatchArray = manifestContent.match(/package="(.+?)"/);

  if (!packageNameMatchArray || packageNameMatchArray.length < 2) {
    console.error(kleur.red('\nCannot extract package from manifest\n'));
    return;
  }

  const packageName = packageNameMatchArray[1] as string;
  const packageElements = packageName.split('.');

  let sourceDir = path.join(manifestPath.replace('/AndroidManifest.xml', ''), 'java', ...packageElements);
  if (!fs.existsSync(sourceDir)) {
    // Handle project with kotlin source set
    sourceDir = path.join(manifestPath.replace('/AndroidManifest.xml', ''), 'kotlin', ...packageElements);
    if (!fs.existsSync(sourceDir)) {
      console.error(kleur.red(`\nCannot find main source set at ${sourceDir}\n`));
      return;
    }
  }

  fs.mkdirSync(path.join(sourceDir, pluginName.toLowerCase()));

  const ext = lang === 'Kotlin' ? '.kt' : '.java';
  const pluginFilename = pluginName + 'Plugin' + ext;

  spinner.text = `Generating ${pluginFilename}`;
  spinner.start();
  const pluginContent = createPluginFile(lang, packageName, pluginName, methodName);

  fs.writeFileSync(path.join(sourceDir, pluginName.toLowerCase(), pluginFilename), pluginContent, 'utf-8');
  spinner.succeed();
  const pluginPackageFilename = pluginName + 'PluginPackage' + ext;

  spinner.text = `Generating ${pluginPackageFilename}`;
  spinner.start();
  const pluginPackageContent = createPluginPackageFile(lang, packageName, pluginName, isApplicationPackage);

  fs.writeFileSync(path.join(sourceDir, isApplicationPackage ? pluginName.toLowerCase() : '', pluginPackageFilename), pluginPackageContent, 'utf-8');
  spinner.succeed();

  console.log('\n');
  if (isApplicationPackage) {
    console.log(kleur.yellow(`Finish Android setup with registering ${pluginName + 'PluginPackage'}
in getPackages method, in your MainApplication.(java|kt)

@Override
protected List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // ...
  packages.add(new ${pluginName + 'PluginPackage'}()); // <- add
  return packages;
}`.trim()));
    console.log('\n');
  }

  printFinishSetup(methodName);
}
