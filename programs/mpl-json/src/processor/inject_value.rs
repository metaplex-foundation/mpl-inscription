use borsh::BorshDeserialize;
use mpl_utils::{assert_derivation, assert_signer};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::invoke,
    program_memory::{sol_memcpy, sol_memmove},
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

use crate::{
    error::MplJsonError,
    instruction::{accounts::SetValueAccounts, InjectValueArgs},
    state::{InscriptionMetadata, INITIAL_SIZE, PREFIX},
};

pub(crate) fn process_inject_value<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: InjectValueArgs,
) -> ProgramResult {
    let ctx = &mut SetValueAccounts::context(accounts)?;

    // Check that the account is already initialized.
    if (ctx.accounts.inscription_account.owner != &crate::ID)
        || ctx.accounts.inscription_account.data_is_empty()
    {
        return Err(MplJsonError::NotInitialized.into());
    }

    // Check that the account isn't already initialized.
    if (ctx.accounts.metadata_account.owner != &crate::ID)
        || ctx.accounts.metadata_account.data_is_empty()
    {
        return Err(MplJsonError::NotInitialized.into());
    }
    let json_metadata =
        InscriptionMetadata::try_from_slice(&ctx.accounts.metadata_account.data.borrow())?;

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
    if bump != json_metadata.bump {
        return Err(MplJsonError::MetadataDerivedKeyInvalid.into());
    }

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

    let start = args.start;
    solana_program::msg!("start: {}", start);
    let end = args.end;
    solana_program::msg!("end: {}", end);
    // let mut json_data: serde_json::Value =
    //     serde_json::from_slice(&ctx.accounts.inscription_account.data.borrow())
    //         .unwrap_or(serde_json::Value::Null);
    // solana_program::msg!("json_data: {:?}", json_data);

    // let new_data: serde_json::Value =
    //     serde_json::from_str(&args.value).map_err(|_| MplJsonError::InvalidJson)?;

    // merge(&mut json_data, &new_data);
    // solana_program::msg!("json_data: {:?}", json_data);

    // let serialized_data = serde_json::to_vec(&json_data).map_err(|_| MplJsonError::InvalidJson)?;

    // Resize the account to fit the new data.
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(INITIAL_SIZE + args.value.len());

    let lamports_diff =
        new_minimum_balance.saturating_sub(ctx.accounts.inscription_account.lamports());
    solana_program::msg!("lamports_diff: {}", lamports_diff);
    invoke(
        &system_instruction::transfer(
            ctx.accounts.payer.key,
            ctx.accounts.inscription_account.key,
            lamports_diff,
        ),
        &[
            ctx.accounts.payer.clone(),
            ctx.accounts.inscription_account.clone(),
            ctx.accounts.system_program.clone(),
        ],
    )?;

    let size_increase = args.value.len().saturating_sub(end - start);
    solana_program::msg!("size_increase: {}", size_increase);
    let post_len = ctx
        .accounts
        .inscription_account
        .data_len()
        .saturating_sub(end);
    let new_end = end
        .checked_add(size_increase)
        .ok_or(MplJsonError::NumericalOverflow)?;
    let end_len = start
        .checked_add(args.value.len())
        .ok_or(MplJsonError::NumericalOverflow)?
        .checked_add(
            ctx.accounts
                .inscription_account
                .data_len()
                .checked_sub(end)
                .ok_or(MplJsonError::NumericalOverflow)?,
        )
        .ok_or(MplJsonError::NumericalOverflow)?;

    ctx.accounts.inscription_account.realloc(end_len, false)?;

    let account_ptr = ctx
        .accounts
        .inscription_account
        .try_borrow_mut_data()?
        .as_mut_ptr();

    unsafe {
        sol_memmove(
            account_ptr.add(end + size_increase),
            account_ptr.add(end),
            post_len,
        )
    };

    // Write the JSON metadata to the JSON metadata account.
    sol_memcpy(
        &mut ctx.accounts.inscription_account.try_borrow_mut_data()?[start..new_end],
        args.value.as_bytes(),
        args.value.len(),
    );

    Ok(())
}
