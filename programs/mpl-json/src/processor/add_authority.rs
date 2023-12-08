use borsh::{BorshDeserialize, BorshSerialize};
use mpl_utils::{assert_signer, resize_or_reallocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplJsonError,
    instruction::{accounts::AddAuthorityAccounts, AddAuthorityArgs},
    state::InscriptionMetadata,
};

pub(crate) fn process_add_authority<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: AddAuthorityArgs,
) -> ProgramResult {
    let ctx = &AddAuthorityAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.metadata_account.owner != &crate::ID)
        || ctx.accounts.metadata_account.data_is_empty()
    {
        return Err(MplJsonError::NotInitialized.into());
    }
    let mut json_metadata =
        InscriptionMetadata::try_from_slice(&ctx.accounts.metadata_account.data.borrow())?;

    // The payer and authority must sign.
    assert_signer(ctx.accounts.payer)?;
    if !json_metadata
        .update_authorities
        .contains(ctx.accounts.payer.key)
    {
        return Err(MplJsonError::InvalidAuthority.into());
    }

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplJsonError::InvalidSystemProgram.into());
    }

    // Add the new authority.
    json_metadata.update_authorities.push(args.new_authority);

    // Write the updated JSON metadata account back to the account.
    let serialized_data = json_metadata.try_to_vec()?;

    // Resize the account to fit the new authority.
    resize_or_reallocate_account_raw(
        ctx.accounts.metadata_account,
        ctx.accounts.payer,
        ctx.accounts.system_program,
        serialized_data.len(),
    )?;

    // Write the JSON metadata to the JSON metadata account.
    sol_memcpy(
        &mut ctx.accounts.metadata_account.try_borrow_mut_data()?,
        &serialized_data,
        serialized_data.len(),
    );

    Ok(())
}
