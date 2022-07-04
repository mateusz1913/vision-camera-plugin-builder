import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

import kleur from 'kleur';
import type { PromptObject } from 'prompts';
import type { Arguments, Options } from 'yargs';

import { getPromptResponse, printFinishSetup, spinner } from './common';

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

const suggestIosXcodeproj = (workingDir: string): string | undefined => {
  const iosDir = path.join(workingDir, 'ios');

  if (!fs.existsSync(iosDir)) {
    return undefined;
  }

  const files = fs.readdirSync(iosDir);
  const sortedFiles = files.sort();

  for (let i = sortedFiles.length - 1; i >= 0; i--) {
    const filename = files[i] as string;
    const ext = path.extname(filename);

    if (ext === '.xcodeproj') {
      return path.resolve(iosDir, filename);
    }
  }

  return undefined;
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
  const { lang, methodName, pluginName, projectPath }: {
    projectPath: string;
    pluginName: string;
    methodName: string;
    lang: 'Swift' | 'ObjC' | 'ObjCPP'
  } = {
    ...argv,
    ...promptResponse,
  };

  spinner.text = `Generating ${pluginName}`;
  spinner.start();

  childProcess.exec(
    `ruby ${path.resolve(__dirname, '../generateIOS.rb')} ${path.resolve(projectPath)} ${pluginName} ${methodName} ${lang}`,
    (err, stdout, stderr) => {
      if (err) {
        spinner.fail();
      } else {
        spinner.succeed();
      }

      stdout.split('\n').map((s) => {
        console.log(kleur.green(s));
      });
      stderr.split('\n').map((s) => {
        console.error(kleur.red(s));
      });
      if (err) {
        console.log(kleur.red(err.message));
      } else {
        printFinishSetup(methodName);
      }
    },
  );
}
