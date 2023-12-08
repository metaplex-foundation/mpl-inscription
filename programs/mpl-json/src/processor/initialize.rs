use borsh::BorshSerialize;
use mpl_utils::{assert_derivation, assert_signer, create_or_allocate_account_raw};
use num_traits::ToPrimitive;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program::invoke,
    program_memory::sol_memcpy, rent::Rent, system_instruction, system_program, sysvar::Sysvar,
};

use crate::{
    error::MplJsonError,
    instruction::{accounts::InitializeAccounts, InitializeArgs},
    state::{DataType, InscriptionMetadata, Key, INITIAL_SIZE, PREFIX},
};

pub(crate) fn process_initialize<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: InitializeArgs,
) -> ProgramResult {
    let ctx = &InitializeAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.inscription_account.owner != &system_program::ID)
        || !ctx.accounts.inscription_account.data_is_empty()
    {
        return Err(MplJsonError::AlreadyInitialized.into());
    }

    // Check that the account isn't already initialized.
    if (ctx.accounts.metadata_account.owner != &system_program::ID)
        || !ctx.accounts.metadata_account.data_is_empty()
    {
        return Err(MplJsonError::AlreadyInitialized.into());
    }
    // Verify that the derived address is correct for the JSON metadata account.
    let bump = assert_derivation(
        &crate::ID,
        ctx.accounts.metadata_account,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.inscription_account.key.as_ref(),
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
    let serialized_data = match args.data_type {
        DataType::Json => match serde_json::to_vec(&json_data) {
            Ok(data) => data,
            Err(_) => return Err(MplJsonError::InvalidJson.into()),
        },
        _ => vec![],
    };

    // Initialize the JSON metadata account.
    solana_program::msg!("Creating JSON account");
    let rent = Rent::get()?;
    let rent_amount = rent.minimum_balance(INITIAL_SIZE);
    invoke(
        &system_instruction::create_account(
            ctx.accounts.payer.key,
            ctx.accounts.inscription_account.key,
            rent_amount,
            serialized_data.len().to_u64().unwrap_or(0),
            &crate::ID,
        ),
        &[
            ctx.accounts.payer.clone(),
            ctx.accounts.inscription_account.clone(),
            ctx.accounts.system_program.clone(),
        ],
    )?;

    // Initialize the JSON metadata.
    let metadata = InscriptionMetadata {
        key: Key::InscriptionMetadataAccount,
        bump,
        data_type: args.data_type,
        inscription_number: None,
        update_authorities: vec![*ctx.accounts.payer.key],
    };

    let serialized_metadata = &metadata.try_to_vec()?;

    // Initialize the JSON metadata account.
    solana_program::msg!("Creating Metadata account");
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

    // Write the JSON metadata to the JSON metadata account.
    sol_memcpy(
        &mut ctx.accounts.metadata_account.try_borrow_mut_data()?,
        serialized_metadata,
        serialized_metadata.len(),
    );

    Ok(())
}
