import fs from 'fs';
import path from 'path';

import type { PromptObject } from 'prompts';
import type { Arguments, Options } from 'yargs';

import { getPromptResponse, printFinishSetup, spinner } from './common';
import {
  createIOSPluginDirectory,
  createObjCPluginImplementation,
  createSwiftPluginImplementation,
  displayFinishStepsForIOSLibraryPlugin,
  getIOSPbxProj,
  isFirstTargetAnApplication,
  saveIOSPbxProj,
  suggestIosXcodeproj,
} from './ios-utils';

type IOSArgName = 'projectPath' | 'pluginName' | 'methodName' | 'lang';

export const iosArgs: Record<IOSArgName, Options> = {
  projectPath: {
    description: 'Path to .xcodeproj file',
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
    choices: [ 'Swift', 'ObjC', 'ObjCPP' ],
  },
};

export async function iosCommandHandler(argv: Arguments<unknown>) {
  const questions: Record<
    IOSArgName,
    Omit<PromptObject<IOSArgName>, 'validate'> & { validate?: (value: string) => boolean | string }
  > = {
    projectPath: {
      type: 'text',
      name: 'projectPath',
      message: 'What is the (relative) path to project\'s .xcodeproj file?',
      initial: suggestIosXcodeproj(process.cwd()),
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
          title: 'Swift',
          value: 'Swift',
        },
        {
          title: 'Objective-C',
          value: 'ObjC',
        },
        {
          title: 'Objective-C++',
          value: 'ObjCPP',
        },
      ],
    },
  };
  const promptResponse = await getPromptResponse<IOSArgName, typeof questions>(questions, argv);
  const { lang = 'Swift', methodName, pluginName, projectPath }: {
    projectPath: string;
    pluginName: string;
    methodName: string;
    lang: 'Swift' | 'ObjC' | 'ObjCPP'
  } = {
    ...argv,
    ...promptResponse,
  };

  const { pbxproj, pbxprojPath } = getIOSPbxProj(projectPath);
  const pluginDirectory = createIOSPluginDirectory(projectPath, pluginName);

  if (lang === 'Swift') {
    createSwiftPluginImplementation(pbxproj, pluginDirectory, pluginName, methodName, spinner);
  } else {
    createObjCPluginImplementation(pbxproj, pluginDirectory, pluginName, methodName, lang, spinner);
  }

  saveIOSPbxProj(pbxproj, pbxprojPath);

  spinner.stop();

  console.log('\n');
  if (!isFirstTargetAnApplication(pbxproj)) {
    displayFinishStepsForIOSLibraryPlugin();
    console.log('\n');
  }

  printFinishSetup(methodName);
}
