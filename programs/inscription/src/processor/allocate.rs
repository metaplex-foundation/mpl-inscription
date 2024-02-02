use borsh::BorshDeserialize;
use mpl_utils::{assert_derivation, assert_signer, resize_or_reallocate_account_raw};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::{ProgramResult, MAX_PERMITTED_DATA_INCREASE},
    system_program,
};

use crate::{
    error::MplInscriptionError,
    instruction::{accounts::AllocateAccounts, AllocateArgs},
    state::{InscriptionMetadata, ASSOCIATION, PREFIX},
};

pub(crate) fn process_allocate<'a>(
    accounts: &'a [AccountInfo<'a>],
    args: AllocateArgs,
) -> ProgramResult {
    let ctx = &mut AllocateAccounts::context(accounts)?;

    // Check that the inscription account is already initialized.
    if ctx.accounts.inscription_account.owner != &crate::ID {
        return Err(MplInscriptionError::NotInitialized.into());
    }

    // Check that the metadata account is already initialized.
    if ctx.accounts.inscription_metadata_account.owner != &crate::ID {
        return Err(MplInscriptionError::NotInitialized.into());
    }
    let inscription_metadata = InscriptionMetadata::try_from_slice(
        &ctx.accounts.inscription_metadata_account.data.borrow(),
    )?;

    // Verify that the derived address is correct for the metadata account.
    match args.associated_tag {
        Some(tag) => {
            // We don't allow empty tags.
            if tag.is_empty() {
                return Err(MplInscriptionError::AssociationTagCannotBeBlank.into());
            }

            // A tag can't be greater than the seed size.
            if tag.len() > 32 {
                return Err(MplInscriptionError::AssociationTagTooLong.into());
            }

            let bump = assert_derivation(
                &crate::ID,
                ctx.accounts.inscription_account,
                &[
                    PREFIX.as_bytes(),
                    ASSOCIATION.as_bytes(),
                    tag.as_bytes(),
                    ctx.accounts.inscription_metadata_account.key.as_ref(),
                ],
                MplInscriptionError::DerivedKeyInvalid,
            )?;

            // Find the tag in the associated inscriptions and check the bump.
            if !inscription_metadata
                .associated_inscriptions
                .iter()
                .any(|associated_inscription| {
                    associated_inscription.tag == tag && associated_inscription.bump == bump
                })
            {
                return Err(MplInscriptionError::DerivedKeyInvalid.into());
            }
        }
        None => {
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
            if bump != inscription_metadata.bump {
                return Err(MplInscriptionError::DerivedKeyInvalid.into());
            }
        }
    }

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

    let max_realloc_size = ctx
        .accounts
        .inscription_account
        .data_len()
        .checked_add(MAX_PERMITTED_DATA_INCREASE)
        .ok_or(MplInscriptionError::NumericalOverflow)?;

    let new_size = std::cmp::min(args.target_size, max_realloc_size);

    // Resize the account to fit the new authority.
    resize_or_reallocate_account_raw(
        ctx.accounts.inscription_account,
        ctx.accounts.payer,
        ctx.accounts.system_program,
        new_size,
    )?;

    Ok(())
}
