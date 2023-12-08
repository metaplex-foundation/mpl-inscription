use crate::instruction::MplJsonInstruction;
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

mod add_authority;
mod close;
mod initialize;
mod inject_value;
mod remove_authority;
mod set_value;

use add_authority::*;
use close::*;
use initialize::*;
use inject_value::*;
use remove_authority::*;
use set_value::*;

pub struct Processor;
impl Processor {
    pub fn process_instruction<'a>(
        _program_id: &Pubkey,
        accounts: &'a [AccountInfo<'a>],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction: MplJsonInstruction = MplJsonInstruction::try_from_slice(instruction_data)?;
        match instruction {
            MplJsonInstruction::Initialize(args) => {
                msg!("Instruction: Initialize");
                process_initialize(accounts, args)
            }
            MplJsonInstruction::Close => {
                msg!("Instruction: Close");
                process_close(accounts)
            }
            MplJsonInstruction::SetValue(args) => {
                msg!("Instruction: SetValue");
                process_set_value(accounts, args)
            }
            MplJsonInstruction::InjectValue(args) => {
                msg!("Instruction: SetValue");
                process_inject_value(accounts, args)
            }
            MplJsonInstruction::AddAuthority(args) => {
                msg!("Instruction: AddAuthority");
                process_add_authority(accounts, args)
            }
            MplJsonInstruction::RemoveAuthority(args) => {
                msg!("Instruction: RemoveAuthority");
                process_remove_authority(accounts, args)
            }
        }
    }
}
