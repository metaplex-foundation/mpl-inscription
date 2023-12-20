use borsh::{BorshDeserialize, BorshSerialize};
use mpl_utils::{assert_signer, resize_or_reallocate_account_raw};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_memory::sol_memcpy,
    system_program,
};

use crate::{
    error::MplInscriptionError, instruction::accounts::RemoveAuthorityAccounts,
    state::InscriptionMetadata,
};

pub(crate) fn process_remove_authority<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &RemoveAuthorityAccounts::context(accounts)?;

    // Check that the account isn't already initialized.
    if (ctx.accounts.metadata_account.owner != &crate::ID)
        || ctx.accounts.metadata_account.data_is_empty()
    {
        return Err(MplInscriptionError::NotInitialized.into());
    }
    let mut inscription_metadata =
        InscriptionMetadata::try_from_slice(&ctx.accounts.metadata_account.data.borrow())?;

    // The payer and authority must sign.
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

    // Remove the authority if they're the signer.
    let index = inscription_metadata
        .update_authorities
        .iter()
        .position(|x| x == authority.key)
        .ok_or(MplInscriptionError::InvalidAuthority)?;
    inscription_metadata.update_authorities.swap_remove(index);

    // Write the updated inscription metadata account back to the account.
    let serialized_data = inscription_metadata.try_to_vec()?;

    // Resize the account to fit the new authority.
    resize_or_reallocate_account_raw(
        ctx.accounts.metadata_account,
        ctx.accounts.payer,
        ctx.accounts.system_program,
        serialized_data.len(),
    )?;

    // Write the inscription metadata to the metadata account.
    sol_memcpy(
        &mut ctx.accounts.metadata_account.try_borrow_mut_data()?,
        &serialized_data,
        serialized_data.len(),
    );

    Ok(())
}
