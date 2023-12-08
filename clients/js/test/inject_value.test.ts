import { TransactionBuilder, generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { findJsonMetadataPda, initialize, injectValue, setValue } from '../src';
import { createUmi } from './_setup';

test('it can inject string data into a JSON account', async (t) => {
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
    value: '{"image": "", "description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}',
    start: null,
    end: null
  }));

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(jsonAccount.publicKey);
  console.log(jsonData);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8')
    console.log(jsonString);

    const start = jsonString.indexOf('"image":"') + '"image":"'.length;
    console.log(start);
    await injectValue(umi, {
      jsonAccount: jsonAccount.publicKey,
      jsonMetadataAccount,
      start,
      end: start,
      value: 'data:image/png;base64,'
    }).sendAndConfirm(umi);

    const parsedData = JSON.parse(jsonString)
    console.log(parsedData);
  }

  // Then an account was created with the correct data.
  const jsonDataInjected = await umi.rpc.getAccount(jsonAccount.publicKey);
  console.log(jsonDataInjected);
  if (jsonDataInjected.exists) {
    const jsonString = Buffer.from(jsonDataInjected.data).toString('utf8')
    console.log(jsonString);

    const start = jsonString.indexOf('"image": "') + '"image": "'.length;
    await injectValue(umi, {
      jsonAccount: jsonAccount.publicKey,
      jsonMetadataAccount,
      start,
      end: start,
      value: 'data:image/png;base64,'
    }).sendAndConfirm(umi);

    const parsedData = JSON.parse(jsonString)
    console.log(parsedData);
    t.assert(parsedData.image === 'data:image/png;base64,')
  }
});