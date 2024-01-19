use borsh::{BorshDeserialize, BorshSerialize};

use mpl_utils::{
    assert_derivation, assert_owned_by, assert_signer, resize_or_reallocate_account_raw,
};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
};

use crate::{
    error::MplInscriptionError,
    instruction::accounts::SetMintAccounts,
    state::{InscriptionMetadata, Key, PREFIX},
};

pub(crate) fn process_set_mint<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &SetMintAccounts::context(accounts)?;

    // Check that the account is already initialized.
    if ctx.accounts.mint_inscription_account.owner != &crate::ID {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    // Check that the account is already initialized.
    if (ctx.accounts.inscription_metadata_account.owner != &crate::ID)
        || ctx.accounts.inscription_metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    assert_owned_by(
        ctx.accounts.mint_account,
        &spl_token::ID,
        MplInscriptionError::IncorrectOwner,
    )?;

    // Verify that the derived address is correct for the metadata account.
    let _inscription_bump = assert_derivation(
        &crate::ID,
        ctx.accounts.mint_inscription_account,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.mint_account.key.as_ref(),
        ],
        MplInscriptionError::DerivedKeyInvalid,
    )?;

    // Verify that the derived address is correct for the metadata account.
    let _bump = assert_derivation(
        &crate::ID,
        ctx.accounts.inscription_metadata_account,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.mint_inscription_account.key.as_ref(),
        ],
        MplInscriptionError::DerivedKeyInvalid,
    )?;

    assert_signer(ctx.accounts.payer)?;

    // Initialize the inscription metadata.
    let mut inscription_metadata = InscriptionMetadata::try_from_slice(
        &ctx.accounts.inscription_metadata_account.data.borrow(),
    )?;

    // Check that the account is a valid inscription metadata account.
    if inscription_metadata.key != Key::MintInscriptionMetadataAccount {
        return Err(MplInscriptionError::InvalidInscriptionMetadataAccount.into());
    }

    inscription_metadata.mint = Some(*ctx.accounts.mint_account.key);

    let serialized_metadata = &inscription_metadata.try_to_vec()?;

    resize_or_reallocate_account_raw(
        ctx.accounts.inscription_metadata_account,
        ctx.accounts.payer,
        ctx.accounts.system_program,
        serialized_metadata.len(),
    )?;

    // Write the inscription metadata to the metadata account.
    sol_memcpy(
        &mut ctx
            .accounts
            .inscription_metadata_account
            .try_borrow_mut_data()?,
        serialized_metadata,
        serialized_metadata.len(),
    );

    Ok(())
}
