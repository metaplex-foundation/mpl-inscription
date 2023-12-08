import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { MPL_JSON_PROGRAM_ID, findJsonMetadataPda, initialize, setValue } from '../src';
import { createUmi } from './_setup';

test('it can set a lot of values', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const jsonAccount = generateSigner(umi);

  const jsonMetadataAccount = await findJsonMetadataPda(umi, { jsonAccount: jsonAccount.publicKey });

  // When we create a new account.
  await initialize(umi, {
    jsonAccount,
    jsonMetadataAccount,
  }).sendAndConfirm(umi);

  for (let i = 0; i < 100; i+=1) {
    // And set the value.
    // eslint-disable-next-line no-await-in-loop
    await setValue(umi, {
      jsonAccount: jsonAccount.publicKey,
      jsonMetadataAccount,
      value: `{"description${i}": "A bread! But on-chain!", "external_url": "https://breadheads.io"}`,
      start: null,
      end: null
    })
    .prepend(setComputeUnitLimit(umi, {units: 1_400_000}))
    .sendAndConfirm(umi);

    // Then an account was created with the correct data.
    // eslint-disable-next-line no-await-in-loop
    const jsonData = await umi.rpc.getAccount(jsonAccount.publicKey);
    // console.log(jsonData);
    if (jsonData.exists) {
      const jsonString = Buffer.from(jsonData.data).toString('utf8')
      const parsedData = JSON.parse(jsonString)
      console.log(parsedData);

      t.like(jsonData, {
        owner: MPL_JSON_PROGRAM_ID,
      });
    }
  }
});
