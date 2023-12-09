use num_derive::FromPrimitive;
use solana_program::{
    decode_error::DecodeError,
    msg,
    program_error::{PrintProgramError, ProgramError},
};
use thiserror::Error;

#[derive(Error, Clone, Debug, Eq, PartialEq, FromPrimitive)]
pub enum MplInscriptionError {
    /// 0 - The account passed in was already initialized.
    #[error("The account has already been initialized")]
    AlreadyInitialized,

    /// 1 - The account passed isn't initialized.
    #[error("The account has not yet been initialized")]
    NotInitialized,

    /// 2 - The key for the JSON metadata account is invalid.
    #[error("The key for the JSON metadata account is invalid.")]
    MetadataDerivedKeyInvalid,

    /// 3 - The system program account is invalid.
    #[error("The system program account is invalid.")]
    InvalidSystemProgram,

    /// 4 - The JSON data is invalid.
    #[error("The JSON data is invalid.")]
    InvalidJson,

    /// 5 - Borsh failed to serialize this account.
    #[error("Borsh failed to serialize this account.")]
    BorshSerializeError,

    /// 6 - The payer does not have authority to perform this action.
    #[error("The payer does not have authority to perform this action.")]
    InvalidAuthority,

    /// 7 - Numerical Overflow
    #[error("Numerical Overflow")]
    NumericalOverflow,
}

impl PrintProgramError for MplInscriptionError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<MplInscriptionError> for ProgramError {
    fn from(e: MplInscriptionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for MplInscriptionError {
    fn type_of() -> &'static str {
        "Mpl Json Error"
    }
}
