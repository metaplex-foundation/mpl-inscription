use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const PREFIX: &str = "Inscription";
pub const INITIAL_SIZE: usize = 1024;
pub const SHARD_COUNT: u8 = 32;
pub const SHARD_PREFIX: &str = "Shard";

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq)]
pub enum Key {
    Uninitialized,
    InscriptionMetadataAccount,
    MintInscriptionMetadataAccount,
    InscriptionShardAccount,
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
    pub inscription_rank: u64,
    pub inscription_bump: Option<u8>,
    pub update_authorities: Vec<Pubkey>,
}

impl Default for InscriptionMetadata {
    fn default() -> Self {
        Self {
            key: Key::InscriptionMetadataAccount,
            bump: 0,
            state: InscriptionState::Raw,
            inscription_rank: u64::MAX,
            inscription_bump: None,
            update_authorities: vec![],
        }
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct InscriptionShard {
    pub key: Key,
    pub bump: u8,
    pub shard_number: u8,
    pub count: u64,
}

impl Default for InscriptionShard {
    fn default() -> Self {
        Self {
            key: Key::InscriptionShardAccount,
            bump: 0,
            shard_number: 0,
            count: 0,
        }
    }
}
