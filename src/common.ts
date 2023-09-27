import kleur from 'kleur';
import ora from 'ora';
import type { PromptObject } from 'prompts';
import prompts from 'prompts';
import type { Arguments } from 'yargs';

export const spinner = ora({ color: 'green' });

export function printFinishSetup(methodName: string) {
  console.log(`${kleur.gray(`${kleur.cyan('Finish plugin JS setup:')}
// For JS/TS
${kleur.green(`import { VisionCameraProxy, Frame } from 'react-native-vision-camera'

const plugin = VisionCameraProxy.getFrameProcessorPlugin('${methodName}')

export function ${methodName}(frame: Frame) {
  'worklet'
  if (plugin == null) {
    throw new Error("Failed to load Frame Processor Plugin!")
  }
  return plugin.call(frame)
}`)}
`)}`.trim());
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
