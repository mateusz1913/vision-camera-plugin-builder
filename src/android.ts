import fs from 'fs';
import path from 'path';

import glob from 'glob';
import kleur from 'kleur';
import ora from 'ora';
import type { PromptObject } from 'prompts';
import prompts from 'prompts';
import type { Arguments, Options } from 'yargs';

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
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin

class ${pluginName}Plugin: FrameProcessorPlugin("${methodName}") {
  override fun callback(image: ImageProxy, params: Array<Any>): Any? {
    // code goes here
    return null
  }
}
`.trim();
  const javaPluginContent = `
package ${packageName}.${pluginName.toLowerCase()};

import androidx.camera.core.ImageProxy;
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;

public class ${pluginName}Plugin extends FrameProcessorPlugin {
  @Override
  public Object callback(ImageProxy image, Object[] params) {
    // code goes here
    return null;
  }

  ${pluginName}Plugin() {
    super("${methodName}");
  }
}
`.trim();

  return lang === 'Kotlin' ? kotlinPluginContent : javaPluginContent;
};

const createPluginPackageFile = (lang: 'Kotlin' | 'Java', packageName: string, pluginName: string) => {
  const kotlinPluginPackageContent = `
package ${packageName}.${pluginName.toLowerCase()}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin

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
package ${packageName}.${pluginName.toLowerCase()};

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;

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

const spinner = ora({ color: 'green' });

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
  const promptResponse = await prompts(
    Object.entries(questions)
      .filter(([ k, v ]) => {
        if (argv[k] && v.validate) {
          return !(v.validate(argv[k] as string) === true);
        }

        return !argv[k];
      })
      .map(([ ,v ]) => v), {
    onCancel: () => {
      process.exit(1);
    },
  });
  const { lang, methodName, pluginName, manifestPath }: {
    manifestPath: string;
    pluginName: string;
    methodName: string;
    lang: 'Kotlin' | 'Java'
  } = {
    ...argv,
    ...promptResponse,
  };

  spinner.text = `Generating ${pluginName}`;
  spinner.start();

  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

  const packageNameMatchArray = manifestContent.match(/package="(.+?)"/);

  if (!packageNameMatchArray || packageNameMatchArray.length < 2) {
    spinner.fail();
    console.error(kleur.red('\nCannot extract package from manifest'));
    return;
  }

  const packageName = packageNameMatchArray[1] as string;
  const packageElements = packageName.split('.');

  let sourceDir = path.join(manifestPath.replace('/AndroidManifest.xml', ''), 'java', ...packageElements);
  if (!fs.existsSync(sourceDir)) {
    // Handle project with kotlin source set
    sourceDir = path.join(manifestPath.replace('/AndroidManifest.xml', ''), 'kotlin', ...packageElements);
    if (!fs.existsSync(sourceDir)) {
      spinner.fail();
      console.error(kleur.red(`\nCannot find main source set at ${sourceDir}`));
      return;
    }
  }

  fs.mkdirSync(path.join(sourceDir, pluginName.toLowerCase()));

  const ext = lang === 'Kotlin' ? '.kt' : '.java';
  const pluginFilename = pluginName + 'Plugin' + ext;

  spinner.text = `Generating ${pluginFilename}`;
  const pluginContent = createPluginFile(lang, packageName, pluginName, methodName);

  fs.writeFileSync(path.join(sourceDir, pluginName, pluginFilename), pluginContent, 'utf-8');
  console.log(kleur.green(`\nGenerated ${pluginFilename}`));
  const pluginPackageFilename = pluginName + 'PluginPackage' + ext; 

  spinner.text = `Generating ${pluginPackageFilename}`;
  const pluginPackageContent = createPluginPackageFile(lang, packageName, pluginName);

  fs.writeFileSync(path.join(sourceDir, pluginName, pluginPackageFilename), pluginPackageContent, 'utf-8');
  console.log(kleur.green(`Generated ${pluginPackageFilename}`));
  spinner.text = '';
  spinner.succeed();
  const isApplicationMatchArray = manifestContent.match(/<application/);

  if (isApplicationMatchArray && isApplicationMatchArray.length > 0) {
    console.log(kleur.yellow(`
    Finish setup with registering ${pluginName + 'PluginPackage'} in getPackages method, in your MainApplication.(java|kt)

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      // ...
      packages.add(new ${pluginName + 'PluginPackage'}()); // <- add
      return packages;
    }
    `.trim()));
  }
}
