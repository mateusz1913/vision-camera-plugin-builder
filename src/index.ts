import yargs from 'yargs';

import { iosArgs, iosCommandHandler } from './ios';

yargs
  .scriptName('vision-camera-plugin-builder')
  .usage('$0 <cmd> [args]')
  .command('ios', 'Generate iOS plugin boilerplate', iosArgs, iosCommandHandler)
  .demandCommand()
  .recommendCommands()
  .strict()
  .argv;