import { TransactionBuilder, generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { MPL_INSCRIPTION_PROGRAM_ID, findInscriptionMetadataPda, initialize, writeData } from '../src';
import { createUmi } from './_setup';

test('it can set JSON data on an account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const metadataAccount = await findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionAccount.publicKey });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(initialize(umi, {
    inscriptionAccount,
    metadataAccount,
  }));

  // And set the value.
  builder = builder.add(writeData(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
    metadataAccount,
    value: Buffer.from('{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}')
  }));

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  console.log(jsonData);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8')
    const parsedData = JSON.parse(jsonString)
    console.log(parsedData);

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});
