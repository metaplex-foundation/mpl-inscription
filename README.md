# MPL Inscriptions

Inscribing is the practice of treating the Solana blockchain as a form of data storage, much like Arweave or IPFS. While other data storage providers provide their own immutability and data integrity guarantees, there is demand for data directly on the native chain of the underlying NFT. Features such as dynamic metadata and images, on-chain attribute orders, and trait locked smart contracts all become possible with inscribed metadata.

Metaplex inscriptions have two operating modes:

- Metadata inscribing
- Direct data storage

In both modes binary data of any format can be directly written to the chain through the Metaplex Inscription program. In addition, the Metaplex SDKs provide direct support for inscribing schemas commonly used for NFTs (i.e. JSON and Image formats).

The Metadata inscribing method creates a PDA attached to a mint account, the same way Metadata is attached to a token mint. The JSON and image data of the NFT can then be written directly to the chain in the PDA. This method provides a backup of the NFT data in the event that current data storage providers should ever go down and means the asset is “fully on Solana.”

Mint inscriptions also include a ranking, which offers a FCFS rarity claim when inscribing an NFT. Using a sharded counter to prevent resource contention, the Mint inscriptions are globally ranked based on their minting order.
The direct data storage can be used as a direct alternative to providers like Arweave and IPFS, rather than as a backup. JSON and Image data can be written directly to the chain. One small caveat of this method is that a gateway is required to enable maximum ecosystem support, much like ar.io, arweave.net, gateway.ipfs.io, etc.

The Metaplex Inscription program is queued up for a full audit to prevent any security issues. The intention is for the program to be made immutable within 6 months to provide maximum security guarantees to users and the Foundation is open to moving upgrade authority into a community multi-sig sooner than this if we can find effective partners.

## Programs

This project contains the following programs:

- [Mpl Inscription](./programs/inscription/README.md) `1NSCRfGeyo7wPUazGbaPBUsTM49e1k2aXewHGARfzSo`

You will need a Rust version compatible with BPF to compile the program, currently we recommend using Rust 1.68.0.

## Clients

This project contains the following clients:

- [JavaScript](./clients/js/README.md)
- [Rust](./clients/rust/README.md)

## Contributing

Check out the [Contributing Guide](./CONTRIBUTING.md) the learn more about how to contribute to this project.
