use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const PREFIX: &str = "JSON";

pub const INITIAL_SIZE: usize = 1024;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    JsonMetadataAccount,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct JsonMetadata {
    pub key: Key,
    pub bump: u8,
    pub mutable: bool,
    pub authorities: Vec<Pubkey>,
}
