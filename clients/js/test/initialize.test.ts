/* eslint-disable no-await-in-loop */
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { InscriptionMetadata, Key, MPL_INSCRIPTION_PROGRAM_ID, fetchInscriptionMetadata, findInscriptionMetadataPda, initialize } from '../src';
import { createUmi, fetchIdempotentInscriptionShard } from './_setup';

test('it can create initialize an Inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const metadataAccount = await findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionAccount.publicKey });

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    metadataAccount,
    inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(umi, metadataAccount);

  // eslint-disable-next-line no-console
  console.log(inscriptionMetadata);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    bump: metadataAccount[1],
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

test('it can create initialize multiple Inscription accounts', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = [generateSigner(umi), generateSigner(umi), generateSigner(umi)];


  for (let i = 0; i < inscriptionAccount.length; i+=1) {
    const metadataAccount = await findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionAccount[i].publicKey });

    // When we create a new account.
    await initialize(umi, {
      inscriptionAccount: inscriptionAccount[i],
      metadataAccount,
      inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
    }).sendAndConfirm(umi);

    // Then an account was created with the correct data.
    const inscriptionMetadata = await fetchInscriptionMetadata(umi, metadataAccount);

    // eslint-disable-next-line no-console
    console.log(inscriptionMetadata);

    t.like(inscriptionMetadata, <InscriptionMetadata>{
      key: Key.InscriptionMetadataAccount,
      bump: metadataAccount[1],
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