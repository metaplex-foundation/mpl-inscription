/* eslint-disable no-await-in-loop */
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  DataType,
  InscriptionMetadata,
  Key,
  MPL_INSCRIPTION_PROGRAM_ID,
  fetchInscriptionMetadata,
  fetchInscriptionShard,
  findInscriptionMetadataPda,
  initialize,
} from '../src';
import { createUmi, fetchIdempotentInscriptionShard } from './_setup';

test('it can initialize an Inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
  const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    inscriptionMetadataAccount,
    inscriptionShardAccount,
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [umi.identity.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});

test('it can initialize multiple Inscription accounts', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = [
    generateSigner(umi),
    generateSigner(umi),
    generateSigner(umi),
  ];

  for (let i = 0; i < inscriptionAccount.length; i += 1) {
    const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
      inscriptionAccount: inscriptionAccount[i].publicKey,
    });

    const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
    const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

    // When we create a new account.
    await initialize(umi, {
      inscriptionAccount: inscriptionAccount[i],
      inscriptionMetadataAccount,
      inscriptionShardAccount,
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    const inscriptionMetadata = await fetchInscriptionMetadata(
      umi,
      inscriptionMetadataAccount
    );

    const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
    t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

    t.like(inscriptionMetadata, <InscriptionMetadata>{
      key: Key.InscriptionMetadataAccount,
      bump: inscriptionMetadataAccount[1],
      dataType: DataType.Uninitialized,
      inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
      updateAuthorities: [umi.identity.publicKey],
    });

    const jsonData = await umi.rpc.getAccount(inscriptionAccount[i].publicKey);
    if (jsonData.exists) {
      t.like(jsonData, {
        owner: MPL_INSCRIPTION_PROGRAM_ID,
        data: Uint8Array.from([]),
      });
    }
  }
});

test('it can initialize an Inscription account with separate authority', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);
  const authority = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
  const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    inscriptionMetadataAccount,
    inscriptionShardAccount,
    authority,
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [authority.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});