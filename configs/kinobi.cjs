const path = require("path");
const k = require("@metaplex-foundation/kinobi");

// Paths.
const clientDir = path.join(__dirname, "..", "clients");
const idlDir = path.join(__dirname, "..", "idls");

// Instanciate Kinobi.
const kinobi = k.createFromIdls([path.join(idlDir, "mpl_inscription.json")]);

// Update programs.
kinobi.update(
  new k.UpdateProgramsVisitor({
    MplInscriptionProgram: { name: "MplInscription" },
  })
);

// Appends a custom account to a program.
kinobi.update(
  new k.TransformNodesVisitor([
    {
      selector: { kind: "programNode", name: "MplInscription" }, // Check your program name
      transformer: (node) => {
        k.assertProgramNode(node);
        return k.programNode({
          ...node,
          accounts: [
            ...node.accounts,
            k.accountNode({
              name: "mintInscription",
              data: k.accountDataNode({
                name: "mintInscriptionData",
                struct: k.structTypeNode([
                  k.structFieldTypeNode({
                    name: "Data",
                    child: k.bytesTypeNode(k.remainderSize()),
                  }),
                ]),
              }),
            }),
            k.accountNode({
              name: "associatedInscriptionAccount",
              data: k.accountDataNode({
                name: "associatedInscriptionData",
                struct: k.structTypeNode([
                  k.structFieldTypeNode({
                    name: "Data",
                    child: k.bytesTypeNode(k.remainderSize()),
                  }),
                ]),
              }),
            }),
          ],
        });
      },
    },
  ])
);

// Update accounts.
kinobi.update(
  new k.UpdateAccountsVisitor({
    inscriptionMetadata: {
      seeds: [
        k.stringConstantSeed("Inscription"),
        k.programSeed(),
        k.publicKeySeed("inscriptionAccount", "The address of the Inscription Account"),
      ],
    },
    inscriptionShard: {
      seeds: [
        k.stringConstantSeed("Inscription"),
        k.stringConstantSeed("Shard"),
        k.programSeed(),
        k.variableSeed("Shard Number", k.numberTypeNode('u8', 'le')),
      ],
    },
    tokenMetadataAccount: {
      seeds: [
        k.stringConstantSeed("metadata"),
        k.publicKeyDefault('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        k.publicKeySeed("mint", "The address of the mint account"),
      ],
    },
    mintInscription: {
      size: null,
      seeds: [
        k.stringConstantSeed("Inscription"),
        k.programSeed(),
        k.publicKeySeed("mint", "The address of the mint account"),
      ],
    },
    associatedInscriptionAccount: {
      seeds: [
        k.stringConstantSeed("Inscription"),
        k.stringConstantSeed("Association"),
        k.stringSeed("associationTag", "The association tag"),
        k.publicKeySeed("inscriptionMetadataAccount", "The address of the Inscription Metadata Account"),
      ],
    },
  })
);

// console.log(k.pdaDefault("inscriptionMetadata"));

kinobi.update(
  new k.SetInstructionAccountDefaultValuesVisitor([
    {
      account: "mintInscription",
      ignoreIfOptional: true,
      ...k.pdaDefault("mintInscription"),
    },
    {
      account: "inscriptionMetadataAccount",
      ignoreIfOptional: true,
      instruction: "initialize",
      ...k.pdaDefault("inscriptionMetadata"),
    },
    {
      account: "tokenMetadataAccount",
      ignoreIfOptional: true,
      ...k.pdaDefault("metadata", {
        importFrom: "mplTokenMetadata",
        seeds: { mint: k.accountDefault("mintAccount") },
      }),
    },
    {
      account: "associatedInscriptionAccount",
      ignoreIfOptional: true,
      ...k.pdaDefault("associatedInscriptionAccount"),
    },
    // {
    //   account: "inscriptionMetadataAccount",
    //   ignoreIfOptional: true,
    //   instruction: "initializeFromMint",
    //   kind: "pda",
    //   // importFrom: "generated",
    //   seeds: [
    //     k.stringConstantSeed("Inscription"),
    //     k.programSeed(),
    //     k.publicKeySeed("mintInscription", "The address of the Inscription Account"),
    //   ],
    // },
    // {
    //   tokenMetadataAccount: "tokenMetadataAccount",
    //   ignoreIfOptional: true,
    //   ...k.pdaDefault("metadata", {
    //     importFrom: "mplTokenMetadata",
    //     seeds: { mint: k.accountDefault}
    //   }),
    // }
  ])
);

kinobi.update(
  new k.UpdateInstructionsVisitor({
    initialize: {
      internal: true,
    },
    initializeFromMint: {
      internal: true,
    }
  })
);

// Update instructions.
// kinobi.update(
//   new k.UpdateInstructionsVisitor({
//     create: {
//       bytesCreatedOnChain: k.bytesFromAccount("myAccount"),
//     },mintInscription
//   })
// );

// Set ShankAccount discriminator.
const key = (name) => ({ field: "key", value: k.vEnum("Key", name) });
kinobi.update(
  new k.SetAccountDiscriminatorFromFieldVisitor({
    // myAccount: key("MyAccount"),
    uninitialized: key("Uninitialized"),
    inscriptionMetadataAccount: key("InscriptionMetadataAccount"),
    mintInscriptionMetadataAccount: key("MintInscriptionMetadataAccount"),
    inscriptionShardAccount: key("InscriptionShardAccount"),
  })
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(new k.RenderJavaScriptVisitor(jsDir, {
  prettier,
  dependencyMap: {
    mplTokenMetadata: "@metaplex-foundation/mpl-token-metadata",
  },
}));

// Go back to rendering the instructions for the rust SDK
kinobi.update(
  new k.UpdateInstructionsVisitor({
    initialize: {
      internal: false,
    },
    initializeFromMint: {
      internal: false,
    }
  })
);

// Render Rust.
const crateDir = path.join(clientDir, "rust");
const rustDir = path.join(clientDir, "rust", "src", "generated");
kinobi.accept(
  new k.RenderRustVisitor(rustDir, {
    formatCode: true,
    crateFolder: crateDir,
  })
);
