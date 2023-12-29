/**
 * This code eclipses the initialize function in clients/js/src/generated/instructions/initialize.ts.
 * It is used to hide the shard retrieval logic from the user, and instead randomly select a shard.
 */

import {
    Context,
    Pda,
    PublicKey,
    Signer,
    TransactionBuilder,
} from '@metaplex-foundation/umi';
import { initialize as hiddenInitialize } from './generated/instructions/initialize';
import { findInscriptionShardPda } from './generated';

// Accounts.
export type InitializeInstructionAccounts = {
    /** The account to store the metadata in. */
    inscriptionAccount: Signer;
    /** The account to store the inscription account's metadata in. */
    inscriptionMetadataAccount?: PublicKey | Pda;
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
export type InitializeInstructionData = { discriminator: number };

export type InitializeInstructionDataArgs = {
    /** The number of the shard to use. */
    shard?: number;
};


// Instruction.
export function initialize(
    context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
    input: InitializeInstructionAccounts & InitializeInstructionDataArgs
): TransactionBuilder {
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
    return hiddenInitialize(context, { inscriptionShardAccount, ...input });
}
