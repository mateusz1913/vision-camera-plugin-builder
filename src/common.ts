import kleur from 'kleur';
import ora from 'ora';
import type { PromptObject } from 'prompts';
import prompts from 'prompts';
import type { Arguments } from 'yargs';

export const spinner = ora({ color: 'green' });

export function printFinishSetup(methodName: string) {
  console.log(`${kleur.bgCyan('Finish plugin JS setup:')}`);
  console.log(`${kleur.cyan(`
import type { Frame } from 'react-native-vision-camera';
import { FrameProcessorPlugins } from 'react-native-vision-camera';

export function ${methodName}(frame: Frame) {
  'worklet';
  return FrameProcessorPlugins.${methodName}(frame);
}`)}`.trim());
  console.log('\n');
}

export function getPromptResponse<ArgName extends string, T extends Record<
  ArgName,
  Omit<PromptObject<ArgName>, 'validate'> & { validate?: (value: string) => boolean | string }
>>(
  questions: T,
  argv: Arguments<unknown>,
) {
  return prompts<ArgName>(
    // eslint-disable-next-line no-extra-parens
    Object.entries<Omit<PromptObject<ArgName>, 'validate'> & { validate?: (value: string) => boolean | string }>(questions)
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
}
