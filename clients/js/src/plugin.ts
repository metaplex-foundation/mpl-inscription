import { UmiPlugin } from '@metaplex-foundation/umi';
import { createMplInscriptionProgram } from './generated';

export const mplInscription = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createMplInscriptionProgram(), false);
  },
});
