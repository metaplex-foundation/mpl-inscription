use borsh::{BorshDeserialize, BorshSerialize};
use mpl_utils::{assert_derivation, assert_signer, create_or_allocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program::invoke,
    program_memory::sol_memcpy, rent::Rent, system_instruction, system_program, sysvar::Sysvar,
};

use crate::{
    error::MplInscriptionError,
    instruction::accounts::InitializeAccounts,
    state::{InscriptionMetadata, InscriptionShard, Key, PREFIX, SHARD_COUNT, SHARD_PREFIX},
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
    if (ctx.accounts.inscription_metadata_account.owner != &system_program::ID)
        || !ctx.accounts.inscription_metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }
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

    // The payer must sign as well as the authority, if present.
    let authority = match ctx.accounts.authority {
        Some(authority) => {
            assert_signer(authority)?;
            authority
        }
        None => ctx.accounts.payer,
    };
    assert_signer(ctx.accounts.payer)?;

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    // Initialize the inscription account.
    let rent = Rent::get()?;
    let rent_amount = rent.minimum_balance(0);
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
    let mut inscription_metadata = InscriptionMetadata {
        bump,
        update_authorities: vec![*authority.key],
        ..InscriptionMetadata::default()
    };

    let mut shard =
        InscriptionShard::try_from_slice(&ctx.accounts.inscription_shard_account.data.borrow())?;
    if shard.key != Key::InscriptionShardAccount {
        return Err(MplInscriptionError::InvalidShardAccount.into());
    }

    let shard_bump = assert_derivation(
        &crate::ID,
        ctx.accounts.inscription_shard_account,
        &[
            PREFIX.as_bytes(),
            SHARD_PREFIX.as_bytes(),
            crate::ID.as_ref(),
            shard.shard_number.to_le_bytes().as_ref(),
        ],
        MplInscriptionError::DerivedKeyInvalid,
    )?;

    if shard_bump != shard.bump {
        return Err(MplInscriptionError::DerivedKeyInvalid.into());
    }

    // Count * 32 + shard_number
    inscription_metadata.inscription_rank = shard
        .count
        .checked_mul(SHARD_COUNT as u64)
        .ok_or(MplInscriptionError::NumericalOverflow)?
        .checked_add(shard.shard_number as u64)
        .ok_or(MplInscriptionError::NumericalOverflow)?;

    shard.count = shard
        .count
        .checked_add(1)
        .ok_or(MplInscriptionError::NumericalOverflow)?;

    let serialized_metadata = &inscription_metadata.try_to_vec()?;

    // Initialize the inscription metadata account.
    create_or_allocate_account_raw(
        crate::ID,
        ctx.accounts.inscription_metadata_account,
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
        &mut ctx
            .accounts
            .inscription_metadata_account
            .try_borrow_mut_data()?,
        serialized_metadata,
        serialized_metadata.len(),
    );

    let serialized_shard = &shard.try_to_vec()?;

    // Write the shard data back to the shard account.
    sol_memcpy(
        &mut ctx
            .accounts
            .inscription_shard_account
            .try_borrow_mut_data()?,
        serialized_shard,
        serialized_shard.len(),
    );

    Ok(())
}
