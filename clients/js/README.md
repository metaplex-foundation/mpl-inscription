# JavaScript client for Mpl Inscription

A Umi-compatible JavaScript library for the project.

## Getting started

1. First, if you're not already using Umi, [follow these instructions to install the Umi framework](https://github.com/metaplex-foundation/umi/blob/main/docs/installation.md).
2. Next, install this library using the package manager of your choice.
   ```sh
   npm install @metaplex-foundation/mpl-inscription
   ```
2. Finally, register the library with your Umi instance like so.
   ```ts
   import { mplInscription } from '@metaplex-foundation/mpl-inscription';
   umi.use(mplInscription());
   ```

3. Inscribe any binary data on chain
   ```ts
   const inscriptionAccount = generateSigner(umi);
   const inscriptionShardAccount = findInscriptionShardPda(umi, { shardNumber: Math.floor(Math.random() * 32) })
   const metadataAccount = await findInscriptionMetadataPda(umi, {
     inscriptionAccount: inscriptionAccount.publicKey,
   });

   await initialize(umi, {
     inscriptionAccount,
     metadataAccount,
     inscriptionShardAccount,
   }).add(
     writeData(umi, {
       inscriptionAccount: inscriptionAccount.publicKey,
       metadataAccount,
       value: Buffer.from(
         'any data that I want to put here! yay'
       ),
     })
   ).sendAndConfirm(umi);
   const inscriptionMetadata = await fetchInscriptionMetadata(umi, metadataAccount);
   console.log("Inscription number: ", inscriptionMetadata.inscriptionRank.toString())
   ```

4. Example on how to mint a simple inscription with small metadata
   ```ts

   // Step 1: Mint an NFT or pNFT
   // See https://developers.metaplex.com/token-metadata/mint

   // Step 2: Inscribe metadata

   const inscriptionAccount = await findMintInscriptionPda(umi, { mint: mint.publicKey });
   const inscriptionMetadataAccount = await findInscriptionMetadataPda(umi, { inscriptionAccount: inscriptionAccount[0] });
   const inscriptionShardAccount = findInscriptionShardPda(umi, { shardNumber: Math.floor(Math.random() * 32) })

   await initializeFromMint(umi, {
     mintInscriptionAccount: inscriptionAccount,
     metadataAccount: inscriptionMetadataAccount,
     mintAccount: mint.publicKey,
     tokenMetadataAccount, // The metadata account from token metadata
     inscriptionShardAccount, // For concurrency
   }).add(
     writeData(umi, {
       inscriptionAccount,
       metadataAccount: inscriptionMetadataAccount,
       value: Buffer.from(
         JSON.stringify(metadata) // your NFT's metadata to be inscribed
       ),
     }
   )).sendAndConfirm(umi);

   const inscriptionMetadata = await fetchInscriptionMetadata(umi, inscriptionMetadataAccount);
   console.log("Inscription number: ", inscriptionMetadata.inscriptionRank.toString())
   ```


You can learn more about this library's API by reading its generated [TypeDoc documentation](https://mpl-inscription-js-docs.vercel.app).

## Contributing

Check out the [Contributing Guide](./CONTRIBUTING.md) the learn more about how to contribute to this library.
