import {
  TransactionBuilder,
  generateSigner,
  percentAmount,
} from '@metaplex-foundation/umi';
import {
  TokenStandard,
  createV1,
  fetchDigitalAssetWithTokenByMint,
  mintV1,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import test from 'ava';
import {
  MPL_INSCRIPTION_PROGRAM_ID,
  findInscriptionMetadataPda,
  findMintInscriptionPda,
  initialize,
  initializeFromMint,
  writeData,
} from '../src';
import { createUmi, fetchIdempotentInscriptionShard } from './_setup';

test('it can set JSON data on an inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const metadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initialize(umi, {
      inscriptionAccount,
      metadataAccount,
      inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
    })
  );

  // And set the value.
  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount.publicKey,
      metadataAccount,
      value: Buffer.from(
        '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}'
      ),
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount.publicKey);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8');
    const parsedData = JSON.parse(jsonString);

    t.assert(parsedData.description);
    t.is(parsedData.description, 'A bread! But on-chain!');
    t.assert(parsedData.external_url);
    t.is(parsedData.external_url, 'https://breadheads.io');

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});

test('it can set JSON data on a mint inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  umi.use(mplTokenMetadata());

  const mint = generateSigner(umi);
  await createV1(umi, {
    mint,
    name: 'My NFT',
    uri: 'https://arweave.net/LcjCf-NDr5bhCJ0YMKGlc8m8qT_J6TDWtIuW8lbu0-A',
    sellerFeeBasisPoints: percentAmount(5.5),
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  await mintV1(umi, {
    mint: mint.publicKey,
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  const inscriptionAccount = await findMintInscriptionPda(umi, {
    mint: mint.publicKey,
  });
  const metadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });
  const asset = await fetchDigitalAssetWithTokenByMint(umi, mint.publicKey);

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.add(
    initializeFromMint(umi, {
      mintInscriptionAccount: inscriptionAccount[0],
      metadataAccount,
      mintAccount: mint.publicKey,
      tokenMetadataAccount: asset.metadata.publicKey,
      tokenAccount: asset.token.publicKey,
      inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
    })
  );

  // And set the value.
  builder = builder.add(
    writeData(umi, {
      inscriptionAccount: inscriptionAccount[0],
      metadataAccount,
      value: Buffer.from(
        '{"description": "A bread! But on-chain!", "external_url": "https://breadheads.io"}'
      ),
    })
  );

  await builder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  // Then an account was created with the correct data.
  const jsonData = await umi.rpc.getAccount(inscriptionAccount[0]);
  if (jsonData.exists) {
    const jsonString = Buffer.from(jsonData.data).toString('utf8');
    const parsedData = JSON.parse(jsonString);

    t.assert(parsedData.description);
    t.is(parsedData.description, 'A bread! But on-chain!');
    t.assert(parsedData.external_url);
    t.is(parsedData.external_url, 'https://breadheads.io');

    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
    });
  }
});
