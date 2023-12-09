import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { InscriptionMetadata, Key, MPL_INSCRIPTION_PROGRAM_ID, fetchInscriptionMetadata, findInscriptionMetadataPda, initialize } from '../src';
import { createUmi } from './_setup';

test('it can create initialize a JSON account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const metadataAccount = await findInscriptionMetadataPda(umi, {inscriptionAccount: inscriptionAccount.publicKey});

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    metadataAccount,
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const jsonMetadata = await fetchInscriptionMetadata(umi, metadataAccount);
  console.log(jsonMetadata);
  t.like(jsonMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    bump: metadataAccount[1],
    updateAuthorities: [umi.identity.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    console.log(jsonData);
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});
