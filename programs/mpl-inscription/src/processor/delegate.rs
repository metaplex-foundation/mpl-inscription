use mpl_token_metadata::accounts::Metadata;
use mpl_utils::{
    assert_derivation, assert_owned_by, assert_signer, create_or_allocate_account_raw,
};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey, system_program,
};

use crate::{error::MplInscriptionError, instruction::accounts::DelegateAccounts, state::PREFIX};

/// There can be multiple collections delegates set at any time.
pub(crate) fn process_delegate<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    let ctx = &DelegateAccounts::context(accounts)?;

    // signers
    assert_signer(ctx.accounts.payer)?;
    assert_signer(ctx.accounts.authority)?;

    // ownership
    assert_owned_by(
        ctx.accounts.metadata,
        &mpl_token_metadata::ID,
        MplInscriptionError::IncorrectOwner,
    )?;
    assert_owned_by(
        ctx.accounts.mint,
        &spl_token::ID,
        MplInscriptionError::IncorrectOwner,
    )?;

    // key match
    if ctx.accounts.system_program.key != &system_program::ID {
        return Err(MplInscriptionError::InvalidSystemProgram.into());
    }

    // account relationships
    let metadata = Metadata::safe_deserialize(&ctx.accounts.metadata.data.borrow())?;
    // authority must match update authority
    if &metadata.update_authority != ctx.accounts.authority.key {
        return Err(MplInscriptionError::InvalidAuthority.into());
    }

    if metadata.mint != *ctx.accounts.mint.key {
        return Err(MplInscriptionError::MintMismatch.into());
    }

    // process the delegation creation (the derivation is checked
    // by the create helper)
    create_pda_account(
        &crate::ID,
        ctx.accounts.delegate_record,
        ctx.accounts.delegate,
        ctx.accounts.mint,
        ctx.accounts.authority,
        ctx.accounts.payer,
        ctx.accounts.system_program,
    )
}

#[allow(clippy::too_many_arguments)]
fn create_pda_account<'a>(
    program_id: &Pubkey,
    delegate_record_info: &'a AccountInfo<'a>,
    delegate_info: &'a AccountInfo<'a>,
    mint_info: &'a AccountInfo<'a>,
    authority_info: &'a AccountInfo<'a>,
    payer_info: &'a AccountInfo<'a>,
    system_program_info: &'a AccountInfo<'a>,
) -> ProgramResult {
    // validates the delegate derivation

    let mut signer_seeds = vec![
        PREFIX.as_bytes(),
        program_id.as_ref(),
        mint_info.key.as_ref(),
        authority_info.key.as_ref(),
        delegate_info.key.as_ref(),
    ];
    let bump = &[assert_derivation(
        program_id,
        delegate_record_info,
        &signer_seeds,
        MplInscriptionError::DerivedKeyInvalid,
    )?];
    signer_seeds.push(bump);

    // allocate the delegate account
    create_or_allocate_account_raw(
        *program_id,
        delegate_record_info,
        system_program_info,
        payer_info,
        0,
        &signer_seeds,
    )?;

    Ok(())
}
