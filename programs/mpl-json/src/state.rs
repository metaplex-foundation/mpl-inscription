use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const PREFIX: &str = "INSCRIPTION";

pub const INITIAL_SIZE: usize = 1024;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    InscriptionMetadataAccount,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq)]
pub enum DataType {
    Json,
    Binary,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct InscriptionMetadata {
    /// Account type for bookkeeping.
    pub key: Key,
    /// Store the bump of this account.
    pub bump: u8,
    /// The type of data in the inscription.
    pub data_type: DataType,
    /// If this is a numbered inscription, then the number.
    pub inscription_number: Option<u64>,
    /// The signers who can update the account data.
    pub update_authorities: Vec<Pubkey>,
}
