use crate::instruction::MplInscriptionInstruction;
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

mod add_authority;
mod clear_data;
mod close;
mod initialize;
mod remove_authority;
mod write_data;

use add_authority::*;
use clear_data::*;
use close::*;
use initialize::*;
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
            MplInscriptionInstruction::Close => {
                msg!("Instruction: Close");
                process_close(accounts)
            }
            MplInscriptionInstruction::WriteData(args) => {
                msg!("Instruction: WriteData");
                process_write_data(accounts, args)
            }
            MplInscriptionInstruction::ClearData => {
                msg!("Instruction: ClearData");
                process_clear_data(accounts)
            }
            MplInscriptionInstruction::AddAuthority(args) => {
                msg!("Instruction: AddAuthority");
                process_add_authority(accounts, args)
            }
            MplInscriptionInstruction::RemoveAuthority => {
                msg!("Instruction: RemoveAuthority");
                process_remove_authority(accounts)
            }
        }
    }
}
