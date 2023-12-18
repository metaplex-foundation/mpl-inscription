import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  TokenStandard,
  createV1,
  fetchDigitalAssetWithTokenByMint,
  mintV1,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  InscriptionMetadata,
  Key,
  MPL_INSCRIPTION_PROGRAM_ID,
  fetchInscriptionMetadata,
  findInscriptionMetadataPda,
  findMintInscriptionPda,
  initializeFromMint,
} from '../src';
import { createUmi, fetchIdempotentInscriptionShard } from './_setup';

test('it can create initialize an Inscription account', async (t) => {
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

  // When we create a new account.
  await initializeFromMint(umi, {
    mintInscriptionAccount: inscriptionAccount,
    metadataAccount,
    mintAccount: mint.publicKey,
    tokenMetadataAccount: asset.metadata.publicKey,
    tokenAccount: asset.token.publicKey,
    inscriptionShardAccount: await fetchIdempotentInscriptionShard(umi),
  }).sendAndConfirm(umi);

  // Then an account was created with the correct data.
  const inscriptionMetadata = await fetchInscriptionMetadata(
    umi,
    metadataAccount
  );

  // eslint-disable-next-line no-console
  console.log(inscriptionMetadata);

  t.like(inscriptionMetadata, <InscriptionMetadata>{
    key: Key.MintInscriptionMetadataAccount,
    bump: metadataAccount[1],
    updateAuthorities: [umi.identity.publicKey],
  });

  const jsonData = await umi.rpc.getAccount(inscriptionAccount[0]);
  if (jsonData.exists) {
    // console.log(jsonData);
    t.like(jsonData, {
      owner: MPL_INSCRIPTION_PROGRAM_ID,
      data: Uint8Array.from([]),
    });
  }
});
