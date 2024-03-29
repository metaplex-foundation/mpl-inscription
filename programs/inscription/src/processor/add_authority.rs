use borsh::{BorshDeserialize, BorshSerialize};
use mpl_utils::{assert_signer, resize_or_reallocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplInscriptionError,
    instruction::{accounts::AddAuthorityAccounts, AddAuthorityArgs},
    state::InscriptionMetadata,
};

pub(crate) fn process_add_authority<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: AddAuthorityArgs,
) -> ProgramResult {
    let ctx = &AddAuthorityAccounts::context(accounts)?;

    // Check that the account is already initialized.
    if (ctx.accounts.inscription_metadata_account.owner != &crate::ID)
        || ctx.accounts.inscription_metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }
    let mut inscription_metadata = InscriptionMetadata::try_from_slice(
        &ctx.accounts.inscription_metadata_account.data.borrow(),
    )?;

    // The payer must sign as well as the authority, if present.
    let authority = match ctx.accounts.authority {
        Some(authority) => {
            assert_signer(authority)?;
            authority
        }
        None => ctx.accounts.payer,
    };

    assert_signer(ctx.accounts.payer)?;

    if !inscription_metadata
        .update_authorities
        .contains(authority.key)
    {
        return Err(MplInscriptionError::InvalidAuthority.into());
    }

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    // Add the new authority.
    if inscription_metadata
        .update_authorities
        .contains(&args.new_authority)
    {
        return Err(MplInscriptionError::AuthorityAlreadyExists.into());
    }

    inscription_metadata
        .update_authorities
        .push(args.new_authority);

    // Write the updated inscription metadata account back to the account.
    let serialized_data = inscription_metadata.try_to_vec()?;

    // Resize the account to fit the new authority.
    resize_or_reallocate_account_raw(
        ctx.accounts.inscription_metadata_account,
        ctx.accounts.payer,
        ctx.accounts.system_program,
        serialized_data.len(),
    )?;

    // Write the inscription metadata to the metadata account.
    sol_memcpy(
        &mut ctx
            .accounts
            .inscription_metadata_account
            .try_borrow_mut_data()?,
        &serialized_data,
        serialized_data.len(),
    );

    Ok(())
}
