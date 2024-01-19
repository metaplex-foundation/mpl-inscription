/* eslint-disable no-await-in-loop */
import { generateSigner, none } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  AssociatedInscription,
  DataType,
  InscriptionMetadata,
  Key,
  MPL_INSCRIPTION_PROGRAM_ID,
  fetchInscriptionMetadata,
  fetchInscriptionShard,
  findInscriptionMetadataPda,
  findInscriptionShardPda,
  initialize,
} from '../src';
import { createUmi } from './_setup';

test('it can initialize an Inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  const inscriptionShardAccount = await findInscriptionShardPda(umi, {
    shardNumber: 0,
  });
  const shardDataBefore = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    inscriptionShardAccount,
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  const shardDataAfter = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    inscriptionAccount: inscriptionAccount.publicKey,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank:
      shardDataBefore.count * BigInt(32) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [umi.identity.publicKey],
    associatedInscriptions: [] as AssociatedInscription[],
    mint: none(),
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

    const inscriptionShardAccount = await findInscriptionShardPda(umi, {
      shardNumber: 0,
    });
    const shardDataBefore = await fetchInscriptionShard(
      umi,
      inscriptionShardAccount
    );

    // When we create a new account.
    await initialize(umi, {
      inscriptionAccount: inscriptionAccount[i],
      inscriptionShardAccount,
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    const inscriptionMetadata = await fetchInscriptionMetadata(
      umi,
      inscriptionMetadataAccount
    );

    const shardDataAfter = await fetchInscriptionShard(
      umi,
      inscriptionShardAccount
    );
    t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

    t.like(inscriptionMetadata, <InscriptionMetadata>{
      key: Key.InscriptionMetadataAccount,
      inscriptionAccount: inscriptionAccount[i].publicKey,
      bump: inscriptionMetadataAccount[1],
      dataType: DataType.Uninitialized,
      inscriptionRank:
        shardDataBefore.count * BigInt(32) +
        BigInt(shardDataBefore.shardNumber),
      updateAuthorities: [umi.identity.publicKey],
      associatedInscriptions: [] as AssociatedInscription[],
      mint: none(),
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

  const inscriptionShardAccount = await findInscriptionShardPda(umi, {
    shardNumber: 0,
  });
  const shardDataBefore = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    inscriptionShardAccount,
    authority,
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  const shardDataAfter = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    inscriptionAccount: inscriptionAccount.publicKey,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank:
      shardDataBefore.count * BigInt(32) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [authority.publicKey],
    associatedInscriptions: [] as AssociatedInscription[],
    mint: none(),
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});
