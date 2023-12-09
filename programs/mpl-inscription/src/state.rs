use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const PREFIX: &str = "Inscription";

pub const INITIAL_SIZE: usize = 1024;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    InscriptionMetadataAccount,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct InscriptionMetadata {
    pub key: Key,
    pub bump: u8,
    pub inscription_number: Option<u64>,
    pub update_authorities: Vec<Pubkey>,
}
