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

    // Check that the account isn't already initialized.
    if (ctx.accounts.inscription_account.owner != &crate::ID)
        || ctx.accounts.inscription_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    // Check that the account isn't already initialized.
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
        MplInscriptionError::MetadataDerivedKeyInvalid,
    )?;
    if bump != inscription_metadata.bump {
        return Err(MplInscriptionError::MetadataDerivedKeyInvalid.into());
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

    // Close both accounts
    close_account_raw(ctx.accounts.payer, ctx.accounts.inscription_account)?;
    close_account_raw(ctx.accounts.payer, ctx.accounts.metadata_account)?;

    Ok(())
}
