import test from 'ava';
import { createBigInt } from '@metaplex-foundation/umi';
import {
  Key,
  createShard,
  findInscriptionShardPda,
  safeFetchInscriptionShard,
} from '../src';
import { createUmi } from './_setup';

test('it can create a shard account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();

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

  t.like(shardData, {
    key: Key.InscriptionShardAccount,
    bump: shardAccount[1],
    shardNumber: 0,
    count: createBigInt(0),
  });
});

test('it can create all of the shard accounts', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();

  for (let i = 0; i < 32; i += 1) {
    const shardAccount = findInscriptionShardPda(umi, { shardNumber: i });

    // eslint-disable-next-line no-await-in-loop
    let shardData = await safeFetchInscriptionShard(umi, shardAccount);

    if (!shardData) {
      // eslint-disable-next-line no-await-in-loop
      await createShard(umi, {
        shardAccount,
        shardNumber: i,
      }).sendAndConfirm(umi);

      // Then an account was created with the correct data.
      // eslint-disable-next-line no-await-in-loop
      shardData = await safeFetchInscriptionShard(umi, shardAccount);
    }

    t.like(shardData, {
      key: Key.InscriptionShardAccount,
      bump: shardAccount[1],
      shardNumber: i,
      count: createBigInt(0),
    });
  }
});
