use borsh::{BorshDeserialize, BorshSerialize};
use shank::{ShankContext, ShankInstruction};
use solana_program::pubkey::Pubkey;

use crate::state::DataType;

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, ShankContext, ShankInstruction)]
#[rustfmt::skip]
pub enum MplJsonInstruction {
    /// Initialize the account
    #[account(0, writable, signer, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    Initialize(InitializeArgs),

    /// Close the account
    #[account(0, writable, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    Close,

    /// Set a value in JSON account data
    #[account(0, writable, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    SetValue(SetValueArgs),

    /// Inject a value into the account
    #[account(0, writable, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    InjectValue(InjectValueArgs),

    /// Add an authority to the account
    #[account(0, writable, name="metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    AddAuthority(AddAuthorityArgs),

    /// Remove an authority from the account
    #[account(0, writable, name="metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    RemoveAuthority(RemoveAuthorityArgs),
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct InitializeArgs {
    pub data_type: DataType,
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct SetValueArgs {
    pub data_type: DataType,
    pub start: Option<usize>,
    pub end: Option<usize>,
    pub value: String,
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct InjectValueArgs {
    pub data_type: DataType,
    pub start: usize,
    pub end: usize,
    pub value: String,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct AddAuthorityArgs {
    pub new_authority: Pubkey,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct RemoveAuthorityArgs {
    pub authority: Pubkey,
}
