import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  TokenStandard,
  createV1,
  fetchDigitalAsset,
  mintV1,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  DataType,
  InscriptionMetadata,
  Key,
  MPL_INSCRIPTION_PROGRAM_ID,
  fetchInscriptionMetadata,
  fetchInscriptionShard,
  findInscriptionMetadataPda,
  findMintInscriptionPda,
  initializeFromMint,
} from '../src';
import { createUmi, fetchIdempotentInscriptionShard } from './_setup';

test('it can initialize a Mint Inscription account', async (t) => {
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
  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });

  const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
  const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

  const asset = await fetchDigitalAsset(umi, mint.publicKey);

  // When we create a new account.
  await initializeFromMint(umi, {
    mintInscriptionAccount: inscriptionAccount,
    inscriptionMetadataAccount,
    mintAccount: mint.publicKey,
    tokenMetadataAccount: asset.metadata.publicKey,
    inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.MintInscriptionMetadataAccount,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [umi.identity.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount[0]);
  if (jsonData.exists) {
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});

test('it cannot initialize a Mint Inscription account if it is not the update authority of the NFT', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  umi.use(mplTokenMetadata());
  const authority = generateSigner(umi);

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
  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });

  const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
  const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

  const asset = await fetchDigitalAsset(umi, mint.publicKey);

  // When we create a new account.
  const promise = initializeFromMint(umi, {
    mintInscriptionAccount: inscriptionAccount,
    inscriptionMetadataAccount,
    mintAccount: mint.publicKey,
    authority,
    tokenMetadataAccount: asset.metadata.publicKey,
    inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
  }).sendAndConfirm(umi);

  await t.throwsAsync(promise, { name: 'InvalidAuthority' });

  const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
  t.is(shardDataBefore.count, shardDataAfter.count);
});

test('it can initialize a Mint Inscription account with separate authority', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  umi.use(mplTokenMetadata());

  const authority = generateSigner(umi);

  const mint = generateSigner(umi);
  await createV1(umi, {
    mint,
    name: 'My NFT',
    uri: 'https://arweave.net/LcjCf-NDr5bhCJ0YMKGlc8m8qT_J6TDWtIuW8lbu0-A',
    sellerFeeBasisPoints: percentAmount(5.5),
    tokenStandard: TokenStandard.NonFungible,
    updateAuthority: authority,
    creators: [{address: authority.publicKey, verified: false, share: 100}],
  }).sendAndConfirm(umi);

  const inscriptionShardAccount = await fetchIdempotentInscriptionShard(umi);
  const shardDataBefore = await fetchInscriptionShard(umi, inscriptionShardAccount);

  await mintV1(umi, {
    mint: mint.publicKey,
    tokenStandard: TokenStandard.NonFungible,
    authority,
  }).sendAndConfirm(umi);

  const inscriptionAccount = await findMintInscriptionPda(umi, {
    mint: mint.publicKey,
  });
  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });
  const asset = await fetchDigitalAsset(umi, mint.publicKey);

  // When we create a new account.
  await initializeFromMint(umi, {
    mintInscriptionAccount: inscriptionAccount,
    inscriptionMetadataAccount,
    mintAccount: mint.publicKey,
    tokenMetadataAccount: asset.metadata.publicKey,
    authority,
    inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  const shardDataAfter = await fetchInscriptionShard(umi, inscriptionShardAccount)
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.MintInscriptionMetadataAccount,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank: (shardDataBefore.count * BigInt(32)) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [authority.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount[0]);
  if (jsonData.exists) {
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});
