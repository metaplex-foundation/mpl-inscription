import { TransactionBuilder, generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { MPL_JSON_PROGRAM_ID, findJsonMetadataPda, initialize, setValue } from '../src';
import { createUmi } from './_setup';

test('it can create initialize a JSON account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const jsonAccount = generateSigner(umi);

  const jsonMetadataAccount = await findJsonMetadataPda(umi, { jsonAccount: jsonAccount.publicKey });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(initialize(umi, {
    jsonAccount,
    jsonMetadataAccount,
  }));

  // And set the value.
  builder = builder.add(setValue(umi, {
    jsonAccount: jsonAccount.publicKey,
    jsonMetadataAccount,
    value: '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}'
  }));

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(jsonAccount.publicKey);
  console.log(jsonData);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8')
    const parsedData = JSON.parse(jsonString)
    console.log(parsedData);
    
    t.like(jsonData, {
      owner: MPL_JSON_PROGRAM_ID,
    });
  }
});
