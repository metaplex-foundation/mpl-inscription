import { UmiPlugin } from '@metaplex-foundation/umi';
import { createMplInscriptionProgram } from './generated';

export const MplInscription = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createMplInscriptionProgram(), false);
  },
});
