import fs from 'fs';
import path from 'path';

import kleur from 'kleur';
import type { PromptObject } from 'prompts';
import type { Arguments, Options } from 'yargs';

import {
  createAndroidPluginDirectory,
  createPluginFile,
  createPluginPackageFile,
  displayExtractPackageNameErrorMessage,
  extractPackageName,
  getSourceSetDirectory,
  printFinishSetupForAndroid,
  suggestAndroidManifest,
} from './android-utils';
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

  spinner.text = 'Extracting android package name';
  spinner.start();

  const packageName = extractPackageName(path.resolve(path.dirname(manifestPath), '..', '..'), manifestPath);

  if (!packageName) {
    spinner.fail();
    displayExtractPackageNameErrorMessage();
    return;
  }

  spinner.succeed();

  spinner.text = 'Getting source set directory';
  spinner.start();

  const sourceDir = getSourceSetDirectory(manifestPath, packageName);

  if (!sourceDir) {
    spinner.fail();
    console.error(kleur.red(`\nCannot find main source set at ${sourceDir}\n`));
    return;
  }

  spinner.succeed();

  createAndroidPluginDirectory(sourceDir, pluginName);
  createPluginFile(
    sourceDir,
    packageName,
    pluginName,
    lang,
    spinner,
  );
  createPluginPackageFile(
    sourceDir,
    manifestPath,
    packageName,
    pluginName,
    methodName,
    lang,
    spinner,
  );

  spinner.stop();

  console.log('\n');
  printFinishSetupForAndroid(manifestPath, pluginName);

  printFinishSetup(methodName);
}
