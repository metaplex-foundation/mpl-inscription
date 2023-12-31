/* eslint-disable import/no-extraneous-dependencies */
import { createUmi as basecreateUmi } from '@metaplex-foundation/umi-bundle-tests';
import { Umi } from '@metaplex-foundation/umi';
import pMap from 'p-map';
import {
  MplInscription,
  createShard,
  findInscriptionShardPda,
  safeFetchInscriptionShard,
} from '../src';

export const createUmi = async () => {
  const umi = (await basecreateUmi()).use(MplInscription());
  
  // Use pMap to parallelize the creation of all 32 shards.
  await pMap(Array(32).fill(0), async (_, shardNumber) => {
    await createShardIdempotent(umi, shardNumber);
  }, { concurrency: 32 });

  return umi;
}

async function createShardIdempotent(umi: Umi, shardNumber: number) {
  const shardAccount = findInscriptionShardPda(umi, { shardNumber });

    // Check if the account has already been created.
    const shardData = await safeFetchInscriptionShard(umi, shardAccount);

    if (!shardData) {
      await createShard(umi, {
        shardAccount,
        shardNumber,
      }).sendAndConfirm(umi);
    }
}
