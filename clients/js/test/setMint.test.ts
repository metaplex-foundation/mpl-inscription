import {
  TransactionBuilder,
  generateSigner,
  percentAmount,
  some,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  TokenStandard,
  createV1,
  mintV1,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  AssociatedInscription,
  DataType,
  InscriptionMetadata,
  Key,
  fetchInscriptionMetadata,
  findInscriptionMetadataPda,
  findMintInscriptionPda,
  initialize,
  initializeFromMint,
  setMint,
} from '../src';
import { createUmi } from './_setup';

test('it can set the mint on a Mint Inscription account', async (t) => {
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

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.append(
    initializeFromMint(umi, {
      mintAccount: mint.publicKey,
    })
  );

  // Set the mint on the account.
  builder = builder.append(
    setMint(umi, {
      mintInscriptionAccount: inscriptionAccount,
      inscriptionMetadataAccount,
      mintAccount: mint.publicKey,
    })
  );

  await builder.sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    inscriptionMetadataAccount
  );

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.MintInscriptionMetadataAccount,
    inscriptionAccount: inscriptionAccount[0],
    bump: inscriptionMetadataAccount[1],
    dataType: DataType.Uninitialized,
    updateAuthorities: [umi.identity.publicKey],
    associatedInscriptions: [] as AssociatedInscription[],
    mint: some(mint.publicKey),
  });
});

test('it cannot set the mint on an Inscription account that is not derived from a mint', async (t) => {
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

  // We are creating an inscription account that is not derived from a mint and is not a PDA.
  const inscriptionAccount = generateSigner(umi);

  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount.publicKey,
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.append(
    initialize(umi, {
      inscriptionAccount,
    })
  );

  // Set the mint on the account.
  builder = builder.append(
    setMint(umi, {
      mintInscriptionAccount: inscriptionAccount.publicKey,
      inscriptionMetadataAccount,
      mintAccount: mint.publicKey,
    })
  );

  const promise = builder.sendAndConfirm(umi);
  // Then an error is thrown.
  await t.throwsAsync(promise, { name: 'DerivedKeyInvalid' });
});

test('it cannot set the wrong mint on a Mint Inscription account', async (t) => {
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

  // Create a second mint.
  const wrongMint = generateSigner(umi);
  await createV1(umi, {
    mint: wrongMint,
    name: 'My NFT',
    uri: 'https://arweave.net/LcjCf-NDr5bhCJ0YMKGlc8m8qT_J6TDWtIuW8lbu0-A',
    sellerFeeBasisPoints: percentAmount(5.5),
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  await mintV1(umi, {
    mint: wrongMint.publicKey,
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  const inscriptionAccount = await findMintInscriptionPda(umi, {
    mint: mint.publicKey,
  });
  const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, {
    inscriptionAccount: inscriptionAccount[0],
  });

  let builder = new TransactionBuilder();

  // When we create a new account.
  builder = builder.append(
    initializeFromMint(umi, {
      mintAccount: mint.publicKey,
    })
  );

  // It tries to set the mint to an invalid mint.
  builder = builder.append(
    setMint(umi, {
      mintInscriptionAccount: inscriptionAccount,
      inscriptionMetadataAccount,
      mintAccount: wrongMint.publicKey,
    })
  );

  const promise = builder.sendAndConfirm(umi);

  // And it fails because the derivation from the wrong mint is invalid.
  await t.throwsAsync(promise, { name: 'DerivedKeyInvalid' });
});
