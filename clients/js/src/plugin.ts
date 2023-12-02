import { UmiPlugin } from '@metaplex-foundation/umi';
import { createMplJsonProgram } from './generated';

export const mplJson = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createMplJsonProgram(), false);
  },
});
