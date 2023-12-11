use borsh::BorshSerialize;
use mpl_utils::{assert_derivation, create_or_allocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplInscriptionError,
    instruction::{accounts::CreateShardAccounts, CreateShardArgs},
    state::{InscriptionShard, PREFIX, SHARD_PREFIX},
};

pub(crate) fn process_create_shard<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: CreateShardArgs,
) -> ProgramResult {
    let ctx = &CreateShardAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.shard_account.owner != &system_program::ID)
        || !ctx.accounts.shard_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }

    let bump = assert_derivation(
        &crate::ID,
        ctx.accounts.shard_account,
        &[
            PREFIX.as_bytes(),
            SHARD_PREFIX.as_bytes(),
            crate::ID.as_ref(),
            args.shard_number.to_le_bytes().as_ref(),
        ],
        MplInscriptionError::DerivedKeyInvalid,
    )?;

    let shard = InscriptionShard {
        bump,
        shard_number: args.shard_number,
        ..InscriptionShard::default()
    };

    let serialized_data = &shard.try_to_vec()?;

    // Create the account.
    create_or_allocate_account_raw(
        crate::ID,
        ctx.accounts.shard_account,
        ctx.accounts.system_program,
        ctx.accounts.payer,
        serialized_data.len(),
        &[
            PREFIX.as_bytes(),
            SHARD_PREFIX.as_bytes(),
            crate::ID.as_ref(),
            args.shard_number.to_le_bytes().as_ref(),
        ],
    )?;

    // Write the data.
    sol_memcpy(
        &mut ctx.accounts.shard_account.data.borrow_mut(),
        serialized_data,
        serialized_data.len(),
    );

    Ok(())
}
