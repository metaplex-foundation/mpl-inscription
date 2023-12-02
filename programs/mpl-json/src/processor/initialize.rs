use borsh::BorshSerialize;
use mpl_utils::{assert_derivation, assert_signer, create_or_allocate_account_raw};
use num_traits::ToPrimitive;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program::invoke,
    program_memory::sol_memcpy, rent::Rent, system_instruction, system_program, sysvar::Sysvar,
};

use crate::{
    error::MplJsonError,
    instruction::accounts::InitializeAccounts,
    state::{JsonMetadata, Key, INITIAL_SIZE, PREFIX},
};

pub(crate) fn process_initialize<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &InitializeAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.json_account.owner != &system_program::ID)
        || !ctx.accounts.json_account.data_is_empty()
    {
        return Err(MplJsonError::AlreadyInitialized.into());
    }

    // Check that the account isn't already initialized.
    if (ctx.accounts.json_metadata_account.owner != &system_program::ID)
        || !ctx.accounts.json_metadata_account.data_is_empty()
    {
        return Err(MplJsonError::AlreadyInitialized.into());
    }
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

    // The payer and authority must sign.
    assert_signer(ctx.accounts.payer)?;

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplJsonError::InvalidSystemProgram.into());
    }

    // Initialize the JSON data with a null value.
    let json_data = serde_json::Value::Null;
    let serialized_data = match serde_json::to_vec(&json_data) {
        Ok(data) => data,
        Err(_) => return Err(MplJsonError::InvalidJson.into()),
    };

    // Initialize the JSON metadata account.
    solana_program::msg!("Creating JSON account");
    let rent = Rent::get()?;
    let rent_amount = rent.minimum_balance(INITIAL_SIZE);
    invoke(
        &system_instruction::create_account(
            ctx.accounts.payer.key,
            ctx.accounts.json_account.key,
            rent_amount,
            serialized_data.len().to_u64().unwrap_or(0),
            &crate::ID,
        ),
        &[
            ctx.accounts.payer.clone(),
            ctx.accounts.json_account.clone(),
            ctx.accounts.system_program.clone(),
        ],
    )?;

    // Initialize the JSON metadata.
    let json_metadata = JsonMetadata {
        key: Key::JsonMetadataAccount,
        bump,
        mutable: true,
        authorities: vec![*ctx.accounts.payer.key],
    };

    let serialized_metadata = &json_metadata.try_to_vec()?;

    // Initialize the JSON metadata account.
    solana_program::msg!("Creating JSON Metadata account");
    create_or_allocate_account_raw(
        crate::ID,
        ctx.accounts.json_metadata_account,
        ctx.accounts.system_program,
        ctx.accounts.payer,
        serialized_metadata.len(),
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.json_account.key.as_ref(),
            &[bump],
        ],
    )?;

    // Write the JSON metadata to the JSON metadata account.
    sol_memcpy(
        &mut ctx.accounts.json_metadata_account.try_borrow_mut_data()?,
        serialized_metadata,
        serialized_metadata.len(),
    );

    Ok(())
}
