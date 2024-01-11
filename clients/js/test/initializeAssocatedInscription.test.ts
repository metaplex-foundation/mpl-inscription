import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  TokenStandard,
  createV1,
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
  findAssociatedInscriptionPda,
  findInscriptionMetadataPda,
  findInscriptionShardPda,
  findMintInscriptionPda,
  initialize,
  initializeAssociatedInscription,
  initializeFromMint,
} from '../src';
import { createUmi } from './_setup';

test('it can initialize an Associated Inscription account', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  const inscriptionShardAccount = await findInscriptionShardPda(umi, {
    shardNumber: 0,
  });
  const shardDataBefore = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );

  // When we create a new account.
  await initialize(umi, {
    inscriptionAccount,
    inscriptionShardAccount,
  }).sendAndConfirm(umi);

  const shardDataAfter = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
    associated_tag: 'image',
    inscriptionMetadataAccount,
  });

  // Create an Associated Inscription account.
  await initializeAssociatedInscription(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
    inscriptionMetadataAccount,
    associationTag: 'image',
  }).sendAndConfirm(umi);

  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.InscriptionMetadataAccount,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank:
      shardDataBefore.count * BigInt(32) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [umi.identity.publicKey],
    associatedInscriptions: [
      {
        tag: 'image',
        bump: associatedInscriptionAccount[1],
        dataType: DataType.Uninitialized,
      },
    ],
  });

  const data = await umi.rpc.getAccount(associatedInscriptionAccount[0]);
  if (data.exists) {
    t.like(data, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }

  const shardDataLast = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );
  t.is(shardDataAfter.count, shardDataLast.count);
});

test('it can initialize an Associated Inscription account on a Mint', async (t) => {
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

  const inscriptionShardAccount = await findInscriptionShardPda(umi, {
    shardNumber: 0,
  });
  const shardDataBefore = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );

  // const asset = await fetchDigitalAsset(umi, mint.publicKey);

  // When we create a new account.
  await initializeFromMint(umi, {
    mintAccount: mint.publicKey,
    inscriptionShardAccount,
  }).sendAndConfirm(umi);

  const shardDataAfter = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );
  t.is(shardDataBefore.count + BigInt(1), shardDataAfter.count);

  const associatedInscriptionAccount = findAssociatedInscriptionPda(umi, {
    associated_tag: 'image',
    inscriptionMetadataAccount,
  });

  // Create an Associated Inscription account.
  await initializeAssociatedInscription(umi, {
    inscriptionAccount: inscriptionAccount[0],
    inscriptionMetadataAccount,
    associationTag: 'image',
  }).sendAndConfirm(umi);

  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.MintInscriptionMetadataAccount,
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    inscriptionRank:
      shardDataBefore.count * BigInt(32) + BigInt(shardDataBefore.shardNumber),
    updateAuthorities: [umi.identity.publicKey],
    associatedInscriptions: [
      {
        tag: 'image',
        bump: associatedInscriptionAccount[1],
        dataType: DataType.Uninitialized,
      },
    ],
  });

  const data = await umi.rpc.getAccount(associatedInscriptionAccount[0]);
  if (data.exists) {
    t.like(data, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }

  const shardDataLast = await fetchInscriptionShard(
    umi,
    inscriptionShardAccount
  );
  t.is(shardDataAfter.count, shardDataLast.count);
});
