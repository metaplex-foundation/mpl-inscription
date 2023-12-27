use crate::instruction::MplInscriptionInstruction;
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

mod add_authority;
mod allocate;
mod clear_data;
mod close;
mod create_shard;
mod delegate;
mod initialize;
mod initialize_associated_inscription;
mod initialize_from_mint;
mod remove_authority;
mod write_data;

use add_authority::*;
use allocate::*;
use clear_data::*;
use close::*;
use create_shard::*;
use delegate::*;
use initialize::*;
use initialize_associated_inscription::*;
use initialize_from_mint::*;
use remove_authority::*;
use write_data::*;

pub struct Processor;
impl Processor {
    pub fn process_instruction<'a>(
        _program_id: &Pubkey,
        accounts: &'a [AccountInfo<'a>],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction: MplInscriptionInstruction =
            MplInscriptionInstruction::try_from_slice(instruction_data)?;
        match instruction {
            MplInscriptionInstruction::Initialize => {
                msg!("Instruction: Initialize");
                process_initialize(accounts)
            }
            MplInscriptionInstruction::InitializeFromMint => {
                msg!("Instruction: InitializeFromMint");
                process_initialize_from_mint(accounts)
            }
            MplInscriptionInstruction::Close => {
                msg!("Instruction: Close");
                process_close(accounts)
            }
            MplInscriptionInstruction::WriteData(args) => {
                msg!("Instruction: WriteData");
                process_write_data(accounts, args)
            }
            MplInscriptionInstruction::ClearData(args) => {
                msg!("Instruction: ClearData");
                process_clear_data(accounts, args)
            }
            MplInscriptionInstruction::AddAuthority(args) => {
                msg!("Instruction: AddAuthority");
                process_add_authority(accounts, args)
            }
            MplInscriptionInstruction::RemoveAuthority => {
                msg!("Instruction: RemoveAuthority");
                process_remove_authority(accounts)
            }
            MplInscriptionInstruction::CreateShard(args) => {
                msg!("Instruction: CreateShard");
                process_create_shard(accounts, args)
            }
            MplInscriptionInstruction::InitializeAssociatedInscription(args) => {
                msg!("Instruction: InitializeAssociatedInscription");
                process_initialize_associated_inscription(accounts, args)
            }
            MplInscriptionInstruction::Allocate(args) => {
                msg!("Instruction: Allocate");
                process_allocate(accounts, args)
            }
            MplInscriptionInstruction::Delegate => {
                msg!("Instruction: Delegate");
                process_delegate(accounts)
            }
        }
    }
}
