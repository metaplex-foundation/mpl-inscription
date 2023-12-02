use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
    program_error::PrintProgramError, pubkey::Pubkey,
};

use crate::{error::MplJsonError, processor};

entrypoint!(process_instruction);
fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    instruction_data: &[u8],
) -> ProgramResult {
    if let Err(error) =
        processor::Processor::process_instruction(program_id, accounts, instruction_data)
    {
        // catch the error so we can print it
        error.print::<MplJsonError>();
        return Err(error);
    }
    Ok(())
}
