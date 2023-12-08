import { TransactionBuilder, generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { MPL_JSON_PROGRAM_ID, findJsonMetadataPda, initialize, setValue } from '../src';
import { createUmi } from './_setup';

test('it can set JSON data on an account', async (t) => {
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
    value: '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}',
    start: null,
    end: null
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

test('it can set values in place', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const jsonAccount = generateSigner(umi);

  const jsonMetadataAccount = await findJsonMetadataPda(umi, { jsonAccount: jsonAccount.publicKey });

  // When we create a new account.
  await initialize(umi, {
    jsonAccount,
    jsonMetadataAccount,
  }).sendAndConfirm(umi);

  // And set the value.
  await setValue(umi, {
    jsonAccount: jsonAccount.publicKey,
    jsonMetadataAccount,
    value: `{"setValue": {}}`,
    start: null,
    end: null
  })
  // .prepend(setComputeUnitLimit(umi, {units: 1_400_000}))
  .sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const jsonData0 = await umi.rpc.getAccount(jsonAccount.publicKey);
  // console.log(jsonData0);
  if (jsonData0.exists) {
    const jsonString = Buffer.from(jsonData0.data).toString('utf8')
    const parsedData = JSON.parse(jsonString)
    console.log(parsedData);

    t.like(jsonData0, {
      owner: MPL_JSON_PROGRAM_ID,
    });
  }

  // And set the value.
  await setValue(umi, {
    jsonAccount: jsonAccount.publicKey,
    jsonMetadataAccount,
    value: `{"setValue": {}}`,
    start: 12,
    end: 14
  })
  // .prepend(setComputeUnitLimit(umi, {units: 1_400_000}))
  .sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const jsonData1 = await umi.rpc.getAccount(jsonAccount.publicKey);
  // console.log(jsonData1);
  if (jsonData1.exists) {
    const jsonString = Buffer.from(jsonData1.data).toString('utf8')
    const parsedData = JSON.parse(jsonString)
    console.log(parsedData);

    t.like(jsonData1, {
      owner: MPL_JSON_PROGRAM_ID,
    });
  }
});