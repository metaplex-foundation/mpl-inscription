use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

pub const PREFIX: &str = "Inscription";
pub const ASSOCIATION: &str = "Association";
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
pub enum DataType {
    Uninitialized,
    Binary,
    Json,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AssociatedInscription {
    pub tag: String,
    pub bump: u8,
    pub data_type: DataType,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct InscriptionMetadata {
    pub key: Key,
    pub inscription_account: Pubkey,
    pub bump: u8,
    pub data_type: DataType,
    pub inscription_rank: u64,
    pub inscription_bump: Option<u8>,
    pub update_authorities: Vec<Pubkey>,
    pub associated_inscriptions: Vec<AssociatedInscription>,
    pub mint: Option<Pubkey>,
    pub _padding: [u8; 7],
}

impl Default for InscriptionMetadata {
    fn default() -> Self {
        Self {
            key: Key::InscriptionMetadataAccount,
            inscription_account: Pubkey::default(),
            bump: 0,
            data_type: DataType::Uninitialized,
            inscription_rank: u64::MAX,
            inscription_bump: None,
            update_authorities: vec![],
            associated_inscriptions: vec![],
            mint: None,
            _padding: [0; 7],
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
