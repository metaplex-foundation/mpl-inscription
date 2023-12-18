import { Context, Pda, PublicKey } from "@metaplex-foundation/umi";
import { string, publicKey as publicKeySerializer } from "@metaplex-foundation/umi/serializers";

export function findMintInscriptionPda(
    context: Pick<Context, 'eddsa' | 'programs'>,
    seeds: {
      mint: PublicKey;
    }
  ): Pda {
    const programId = context.programs.getPublicKey(
      'mplInscription',
      '1NSCRfGeyo7wPUazGbaPBUsTM49e1k2aXewHGARfzSo'
    );
    return context.eddsa.findPda(programId, [
      string({ size: 'variable' }).serialize('Inscription'),
      publicKeySerializer().serialize(programId),
      publicKeySerializer().serialize(seeds.mint),
    ]);
  }