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
  })
);

// Update instructions.
// kinobi.update(
//   new k.UpdateInstructionsVisitor({
//     create: {
//       bytesCreatedOnChain: k.bytesFromAccount("myAccount"),
//     },
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
kinobi.accept(new k.RenderJavaScriptVisitor(jsDir, { prettier }));

// Render Rust.
const crateDir = path.join(clientDir, "rust");
const rustDir = path.join(clientDir, "rust", "src", "generated");
kinobi.accept(
  new k.RenderRustVisitor(rustDir, {
    formatCode: true,
    crateFolder: crateDir,
  })
);
