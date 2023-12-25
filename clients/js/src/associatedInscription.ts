import { Context, Pda, PublicKey } from '@metaplex-foundation/umi';
import {
  string,
  publicKey as publicKeySerializer,
} from '@metaplex-foundation/umi/serializers';

export function findAssociatedInscriptionPda(
  context: Pick<Context, 'eddsa' | 'programs'>,
  seeds: {
    associated_tag: string;
    inscriptionMetadataAccount: PublicKey | Pda;
  }
): Pda {
  const programId = context.programs.getPublicKey(
    'mplInscription',
    '1NSCRfGeyo7wPUazGbaPBUsTM49e1k2aXewHGARfzSo'
  );
  return context.eddsa.findPda(programId, [
    string({ size: 'variable' }).serialize('Inscription'),
    string({ size: 'variable' }).serialize(seeds.associated_tag),
    publicKeySerializer().serialize(seeds.inscriptionMetadataAccount),
  ]);
}
