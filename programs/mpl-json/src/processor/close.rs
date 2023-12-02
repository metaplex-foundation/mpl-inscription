use borsh::BorshDeserialize;
use mpl_utils::{assert_derivation, assert_signer, close_account_raw};
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, system_program};

use crate::{
    error::MplJsonError,
    instruction::accounts::CloseAccounts,
    state::{JsonMetadata, PREFIX},
};

pub(crate) fn process_close<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &CloseAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.json_account.owner != &crate::ID) || ctx.accounts.json_account.data_is_empty()
    {
        return Err(MplJsonError::NotInitialized.into());
    }

    // Check that the account isn't already initialized.
    if (ctx.accounts.json_metadata_account.owner != &crate::ID)
        || ctx.accounts.json_metadata_account.data_is_empty()
    {
        return Err(MplJsonError::NotInitialized.into());
    }
    let json_metadata =
        JsonMetadata::try_from_slice(&ctx.accounts.json_metadata_account.data.borrow())?;

    // Verify that the derived address is correct for the JSON metadata account.
    let bump = assert_derivation(
        &crate::ID,
        ctx.accounts.json_metadata_account,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.json_account.key.as_ref(),
        ],
        MplJsonError::MetadataDerivedKeyInvalid,
    )?;
    if bump != json_metadata.bump {
        return Err(MplJsonError::MetadataDerivedKeyInvalid.into());
    }

    // The payer and authority must sign.
    assert_signer(ctx.accounts.payer)?;
    if !json_metadata.authorities.contains(ctx.accounts.payer.key) {
        return Err(MplJsonError::InvalidAuthority.into());
    }

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplJsonError::InvalidSystemProgram.into());
    }

    // Close both accounts
    close_account_raw(ctx.accounts.payer, ctx.accounts.json_account)?;
    close_account_raw(ctx.accounts.payer, ctx.accounts.json_metadata_account)?;

    Ok(())
}
