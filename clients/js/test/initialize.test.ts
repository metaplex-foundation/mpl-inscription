import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { JsonMetadata, Key, MPL_JSON_PROGRAM_ID, fetchJsonMetadata, findJsonMetadataPda, initialize } from '../src';
import { createUmi } from './_setup';

test('it can create initialize a JSON account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const jsonAccount = generateSigner(umi);

  const jsonMetadataAccount = await findJsonMetadataPda(umi, {jsonAccount: jsonAccount.publicKey});

  // When we create a new account.
  await initialize(umi, {
    jsonAccount,
    jsonMetadataAccount,
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const jsonMetadata = await fetchJsonMetadata(umi, jsonMetadataAccount);
  console.log(jsonMetadata);
  t.like(jsonMetadata, <JsonMetadata>{
    key: Key.JsonMetadataAccount,
    bump: jsonMetadataAccount[1],
    authorities: [umi.identity.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(jsonAccount.publicKey);
  if (jsonData.exists) {
    console.log(jsonData);
    t.like(jsonData, {
      owner: MPL_JSON_PROGRAM_ID,
      data: Uint8Array.from([0, 0, 0, 0]),
    });
  }
});
