use borsh::{BorshDeserialize, BorshSerialize};
use mpl_utils::{
    assert_derivation, assert_signer, create_or_allocate_account_raw,
    resize_or_reallocate_account_raw,
};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplInscriptionError,
    instruction::{
        accounts::InitializeAssociatedInscriptionAccounts, AssociateInscriptionAccountArgs,
    },
    state::{AssociatedInscription, DataType, InscriptionMetadata, ASSOCIATION, PREFIX},
};

pub(crate) fn process_initialize_associated_inscription<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: AssociateInscriptionAccountArgs,
) -> ProgramResult {
    let ctx = &InitializeAssociatedInscriptionAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.associated_inscription_account.owner != &system_program::ID)
        || !ctx.accounts.associated_inscription_account.data_is_empty()
    {
        return Err(MplInscriptionError::AlreadyInitialized.into());
    }

    // Check that the account is already initialized.
    if (ctx.accounts.inscription_metadata_account.owner != &crate::ID)
        || ctx.accounts.inscription_metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    let mut inscription_metadata = InscriptionMetadata::try_from_slice(
        &ctx.accounts.inscription_metadata_account.data.borrow(),
    )?;

    // Verify that the derived address is correct for the metadata account.
    let inscription_bump = assert_derivation(
        &crate::ID,
        ctx.accounts.associated_inscription_account,
        &[
            PREFIX.as_bytes(),
            ASSOCIATION.as_bytes(),
            args.association_tag.as_bytes(),
            ctx.accounts.inscription_metadata_account.key.as_ref(),
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

    if !inscription_metadata
        .update_authorities
        .contains(authority.key)
    {
        return Err(MplInscriptionError::InvalidAuthority.into());
    }

    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    // Initialize the associated inscription account.
    create_or_allocate_account_raw(
        crate::ID,
        ctx.accounts.associated_inscription_account,
        ctx.accounts.system_program,
        ctx.accounts.payer,
        0,
        &[
            PREFIX.as_bytes(),
            ASSOCIATION.as_bytes(),
            args.association_tag.as_bytes(),
            ctx.accounts.inscription_metadata_account.key.as_ref(),
            &[inscription_bump],
        ],
    )?;

    // Update the metadata to include the new associated inscription.
    inscription_metadata
        .associated_inscriptions
        .push(AssociatedInscription {
            tag: args.association_tag,
            bump: inscription_bump,
            data_type: DataType::Uninitialized,
        });

    let serialized_metadata = &inscription_metadata.try_to_vec()?;

    // Resize the metadata account to fit the new associated inscription.
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
