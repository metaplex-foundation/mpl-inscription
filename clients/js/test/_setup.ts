/* eslint-disable import/no-extraneous-dependencies */
import { createUmi as basecreateUmi } from '@metaplex-foundation/umi-bundle-tests';
import { Umi } from '@metaplex-foundation/umi';
import {
  MplInscription,
  createShard,
  findInscriptionShardPda,
  safeFetchInscriptionShard,
} from '../src';

export const createUmi = async () =>
  (await basecreateUmi()).use(MplInscription());

export async function fetchIdempotentInscriptionShard(umi: Umi) {
  const shardAccount = findInscriptionShardPda(umi, { shardNumber: 0 });

  // Check if the account has already been created.
  let shardData = await safeFetchInscriptionShard(umi, shardAccount);

  if (!shardData) {
    await createShard(umi, {
      shardAccount,
      shardNumber: 0,
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    shardData = await safeFetchInscriptionShard(umi, shardAccount);
  }

  return shardAccount;
}
