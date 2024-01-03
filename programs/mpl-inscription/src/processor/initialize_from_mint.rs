use borsh::{BorshDeserialize, BorshSerialize};
use mpl_token_metadata::{accounts::Metadata, types::Collection};
use mpl_utils::{
    assert_derivation, assert_owned_by, assert_signer, create_or_allocate_account_raw,
};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplInscriptionError,
    instruction::accounts::InitializeFromMintAccounts,
    state::{InscriptionMetadata, InscriptionShard, Key, PREFIX, SHARD_COUNT, SHARD_PREFIX},
};

pub(crate) fn process_initialize_from_mint<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &InitializeFromMintAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.mint_inscription_account.owner != &system_program::ID)
        || !ctx.accounts.mint_inscription_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }

    // Check that the account isn't already initialized.
    if (ctx.accounts.inscription_metadata_account.owner != &system_program::ID)
        || !ctx.accounts.inscription_metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }

    // Do the standard Token Metadata checks.
    assert_owned_by(
        ctx.accounts.token_metadata_account,
        &mpl_token_metadata::ID,
        MplInscriptionError::IncorrectOwner,
    )?;

    assert_owned_by(
        ctx.accounts.mint_account,
        &spl_token::ID,
        MplInscriptionError::IncorrectOwner,
    )?;

    let token_metadata_data = ctx.accounts.token_metadata_account.try_borrow_data()?;
    let token_metadata: Metadata = Metadata::safe_deserialize(&token_metadata_data)?;

    if token_metadata.mint != *ctx.accounts.mint_account.key {
        return Err(MplInscriptionError::MintMismatch.into());
    }

    // Verify that the derived address is correct for the metadata account.
    let inscription_bump = assert_derivation(
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
    let bump = assert_derivation(
        &crate::ID,
        ctx.accounts.inscription_metadata_account,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.mint_inscription_account.key.as_ref(),
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

    let mut update_authorities = vec![token_metadata.update_authority];
    match (ctx.accounts.delegate_record, token_metadata.collection) {
        (
            Some(delegate_record),
            Some(Collection {
                verified: true,
                key: collection_mint,
            }),
        ) => {
            assert_derivation(
                &crate::ID,
                delegate_record,
                &[
                    PREFIX.as_bytes(),
                    crate::ID.as_ref(),
                    collection_mint.as_ref(),
                    token_metadata.update_authority.as_ref(),
                    authority.key.as_ref(),
                ],
                MplInscriptionError::InvalidDelegate,
            )?;
            update_authorities.push(*authority.key);
        }
        _ => {
            if token_metadata.update_authority != *authority.key {
                return Err(MplInscriptionError::InvalidAuthority.into());
            }
        }
    }

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    // Initialize the inscription account.
    create_or_allocate_account_raw(
        crate::ID,
        ctx.accounts.mint_inscription_account,
        ctx.accounts.system_program,
        ctx.accounts.payer,
        0,
        &[
            PREFIX.as_bytes(),
            crate::ID.as_ref(),
            ctx.accounts.mint_account.key.as_ref(),
            &[inscription_bump],
        ],
    )?;

    // Initialize the inscription metadata.
    let mut inscription_metadata = InscriptionMetadata {
        key: Key::MintInscriptionMetadataAccount,
        bump,
        inscription_bump: Some(inscription_bump),
        update_authorities,
        ..InscriptionMetadata::default()
    };

    if (ctx.accounts.inscription_shard_account.owner == &system_program::ID)
        || ctx.accounts.inscription_shard_account.data_is_empty()
    {
        return Err(MplInscriptionError::InvalidShardAccount.into());
    }

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
            ctx.accounts.mint_inscription_account.key.as_ref(),
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
