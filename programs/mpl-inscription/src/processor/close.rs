use borsh::BorshDeserialize;
use mpl_utils::{assert_derivation, assert_signer, close_account_raw};
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, system_program};

use crate::{
    error::MplInscriptionError,
    instruction::accounts::CloseAccounts,
    state::{InscriptionMetadata, PREFIX},
};

pub(crate) fn process_close<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &CloseAccounts::context(accounts)?;

    // Check that the account is already initialized.
    if (ctx.accounts.inscription_account.owner != &crate::ID)
        || ctx.accounts.inscription_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    // Check that the account is already initialized.
    if (ctx.accounts.inscription_metadata_account.owner != &crate::ID)
        || ctx.accounts.inscription_metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    let inscription_metadata = InscriptionMetadata::try_from_slice(
        &ctx.accounts.inscription_metadata_account.data.borrow(),
    )?;

    // Verify that the derived address is correct for the metadata account.
    let bump = assert_derivation(
        &crate::ID,
        ctx.accounts.inscription_metadata_account,
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

    // Close both accounts
    close_account_raw(ctx.accounts.payer, ctx.accounts.inscription_account)?;
    close_account_raw(
        ctx.accounts.payer,
        ctx.accounts.inscription_metadata_account,
    )?;

    Ok(())
}
