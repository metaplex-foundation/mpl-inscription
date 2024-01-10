/**
 * This code eclipses the initializeFromMint function in clients/js/src/generated/instructions/initializeFromMint.ts.
 * It is used to hide the shard retrieval logic from the user, and instead randomly select a shard.
 */

import {
  Context,
  Pda,
  PublicKey,
  Signer,
  TransactionBuilder,
  publicKey,
} from '@metaplex-foundation/umi';
import { initializeFromMint as hiddenInitialize } from './generated/instructions/initializeFromMint';
import {
  findInscriptionShardPda,
  findInscriptionMetadataPda,
  findMintInscriptionPda,
} from './generated';

// Accounts.
export type InitializeFromMintInstructionAccounts = {
  /** The account to store the metadata in. */
  mintInscriptionAccount?: PublicKey | Pda;
  /** The account to store the inscription account's metadata in. */
  inscriptionMetadataAccount?: PublicKey | Pda;
  /** The mint that will be used to derive the PDA. */
  mintAccount: PublicKey | Pda;
  /** The metadata for the mint. */
  tokenMetadataAccount?: PublicKey | Pda;
  /** The shard account for the inscription counter. */
  inscriptionShardAccount?: PublicKey | Pda;
  /** The account that will pay for the transaction and rent. */
  payer?: Signer;
  /** The authority of the inscription account. */
  authority?: Signer;
  /** System program */
  systemProgram?: PublicKey | Pda;
};

// Data.
export type InitializeFromMintInstructionData = { discriminator: number };

export type InitializeFromMintInstructionDataArgs = {
  /** The number of the shard to use. */
  shard?: number;
};

// Instruction.
export function initializeFromMint(
  context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
  input: InitializeFromMintInstructionAccounts &
    InitializeFromMintInstructionDataArgs
): TransactionBuilder {
  let inscriptionAccount;
  if (input.mintInscriptionAccount) {
    inscriptionAccount = input.mintInscriptionAccount;
  } else {
    inscriptionAccount = findMintInscriptionPda(context, {
      mint: publicKey(input.mintAccount),
    });
  }

  let inscriptionMetadataAccount;
  if (input.inscriptionMetadataAccount) {
    inscriptionMetadataAccount = input.inscriptionMetadataAccount;
  } else {
    inscriptionMetadataAccount = findInscriptionMetadataPda(context, {
      inscriptionAccount: publicKey(inscriptionAccount),
    });
  }

  let inscriptionShardAccount;
  if (input.inscriptionShardAccount) {
    inscriptionShardAccount = input.inscriptionShardAccount;
  } else {
    let shardNumber;
    if (input.shard) {
      shardNumber = input.shard;
    } else {
      shardNumber = Math.floor(Math.random() * 32);
    }
    inscriptionShardAccount = findInscriptionShardPda(context, { shardNumber });
  }
  return hiddenInitialize(context, {
    mintInscriptionAccount: inscriptionAccount,
    inscriptionMetadataAccount,
    mintAccount: input.mintAccount,
    tokenMetadataAccount: input.tokenMetadataAccount,
    inscriptionShardAccount,
    payer: input.payer,
    authority: input.authority,
    systemProgram: input.systemProgram,
  });
}
