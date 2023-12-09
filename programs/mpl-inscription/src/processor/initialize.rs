use borsh::BorshSerialize;
use mpl_utils::{assert_derivation, assert_signer, create_or_allocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program::invoke,
    program_memory::sol_memcpy, rent::Rent, system_instruction, system_program, sysvar::Sysvar,
};

use crate::{
    error::MplInscriptionError,
    instruction::accounts::InitializeAccounts,
    state::{InscriptionMetadata, INITIAL_SIZE, PREFIX},
};

pub(crate) fn process_initialize<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &InitializeAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.inscription_account.owner != &system_program::ID)
        || !ctx.accounts.inscription_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }

    // Check that the account isn't already initialized.
    if (ctx.accounts.metadata_account.owner != &system_program::ID)
        || !ctx.accounts.metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }
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

    // The payer and authority must sign.
    assert_signer(ctx.accounts.payer)?;

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    // Initialize the inscription metadata account.
    let rent = Rent::get()?;
    let rent_amount = rent.minimum_balance(INITIAL_SIZE);
    invoke(
        &system_instruction::create_account(
            ctx.accounts.payer.key,
            ctx.accounts.inscription_account.key,
            rent_amount,
            0,
            &crate::ID,
        ),
        &[
            ctx.accounts.payer.clone(),
            ctx.accounts.inscription_account.clone(),
            ctx.accounts.system_program.clone(),
        ],
    )?;

    // Initialize the inscription metadata.
    let inscription_metadata = InscriptionMetadata {
        bump,
        update_authorities: vec![*ctx.accounts.payer.key],
        ..InscriptionMetadata::default()
    };

    let serialized_metadata = &inscription_metadata.try_to_vec()?;

    // Initialize the inscription metadata account.
    create_or_allocate_account_raw(
        crate::ID,
        ctx.accounts.metadata_account,
        ctx.accounts.system_program,
        ctx.accounts.payer,
        serialized_metadata.len(),
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.inscription_account.key.as_ref(),
            &[bump],
        ],
    )?;

    // Write the inscription metadata to the metadata account.
    sol_memcpy(
        &mut ctx.accounts.metadata_account.try_borrow_mut_data()?,
        serialized_metadata,
        serialized_metadata.len(),
    );

    Ok(())
}
