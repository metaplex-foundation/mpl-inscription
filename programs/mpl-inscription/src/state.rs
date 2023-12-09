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
    MintInscriptionMetadataAccount,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum InscriptionState {
    Raw,
    Validated,
    Curated,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum DataType {
    Binary,
    Json,
    Png,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct InscriptionMetadata {
    pub key: Key,
    pub bump: u8,
    pub state: InscriptionState,
    pub inscription_number: Option<u64>,
    pub inscription_bump: Option<u8>,
    pub update_authorities: Vec<Pubkey>,
}

impl Default for InscriptionMetadata {
    fn default() -> Self {
        Self {
            key: Key::InscriptionMetadataAccount,
            bump: 0,
            state: InscriptionState::Raw,
            inscription_number: None,
            inscription_bump: None,
            update_authorities: vec![],
        }
    }
}
