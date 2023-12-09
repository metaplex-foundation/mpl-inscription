const path = require("path");
const { generateIdl } = require("@metaplex-foundation/shank-js");

const idlDir = path.join(__dirname, "..", "idls");
const binaryInstallDir = path.join(__dirname, "..", ".crates");
const programDir = path.join(__dirname, "..", "programs");

generateIdl({
  generator: "shank",
  programName: "mpl_inscription",
  programId: "JSoNoHBzUEFnjpZtcNcNzv5KLzo4tD5v4Z1pT9G4jJa",
  idlDir,
  binaryInstallDir,
  programDir: path.join(programDir, "mpl-inscription"),
});
