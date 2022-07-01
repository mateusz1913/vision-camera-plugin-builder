import yargs from 'yargs';

import { androidArgs, androidCommandHandler } from './android';
import { iosArgs, iosCommandHandler } from './ios';

yargs
  .scriptName('vision-camera-plugin-builder')
  .usage('$0 <cmd> [args]')
  .command('ios', 'Generate iOS plugin boilerplate', iosArgs, iosCommandHandler)
  .command('android', 'Generate Android plugin boilerplate', androidArgs, androidCommandHandler)
  .demandCommand()
  .recommendCommands()
  .strict()
  .argv;