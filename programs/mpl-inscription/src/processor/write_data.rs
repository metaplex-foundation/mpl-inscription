use borsh::BorshDeserialize;
use mpl_utils::{assert_derivation, assert_signer, resize_or_reallocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplInscriptionError,
    instruction::{accounts::WriteDataAccounts, WriteDataArgs},
    state::{InscriptionMetadata, PREFIX},
};

pub(crate) fn process_write_data<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: WriteDataArgs,
) -> ProgramResult {
    let ctx = &mut WriteDataAccounts::context(accounts)?;

    // Check that the inscription account is already initialized.
    if ctx.accounts.inscription_account.owner != &crate::ID {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    // Check that the metadata account is already initialized.
    if (ctx.accounts.metadata_account.owner != &crate::ID)
        || ctx.accounts.metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }
    let inscription_metadata =
        InscriptionMetadata::try_from_slice(&ctx.accounts.metadata_account.data.borrow())?;

    // Verify that the derived address is correct for the metadata account.
    let bump = assert_derivation(
        &crate::ID,
        ctx.accounts.metadata_account,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.inscription_account.key.as_ref(),
        ],
        MplInscriptionError::DerivedKeyInvalid,
    )?;
    if bump != inscription_metadata.bump {
        return Err(MplInscriptionError::DerivedKeyInvalid.into());
    }

    // The payer and authority must sign.
    assert_signer(ctx.accounts.payer)?;
    if !inscription_metadata
        .update_authorities
        .contains(ctx.accounts.payer.key)
    {
        return Err(MplInscriptionError::InvalidAuthority.into());
    }

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    let old_size = ctx.accounts.inscription_account.data_len();
    let new_size = old_size
        .checked_add(args.value.len())
        .ok_or(MplInscriptionError::NumericalOverflow)?;
    // Resize the account to fit the new authority.
    resize_or_reallocate_account_raw(
        ctx.accounts.inscription_account,
        ctx.accounts.payer,
        ctx.accounts.system_program,
        new_size,
    )?;

    // Write the inscription metadata to the metadata account.
    sol_memcpy(
        &mut ctx.accounts.inscription_account.try_borrow_mut_data()?[old_size..],
        &args.value,
        args.value.len(),
    );

    Ok(())
}
