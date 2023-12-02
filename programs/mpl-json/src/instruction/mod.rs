use borsh::{BorshDeserialize, BorshSerialize};
use shank::{ShankContext, ShankInstruction};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, ShankContext, ShankInstruction)]
#[rustfmt::skip]
pub enum MplJsonInstruction {
    /// Initialize the JSON account
    #[account(0, writable, signer, name="json_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="json_metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    Initialize,

    /// Close the JSON account
    #[account(0, writable, name="json_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="json_metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    Close,

    /// Set a value in the JSON account
    #[account(0, writable, name="json_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="json_metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    SetValue(SetValueArgs),

    /// Append a value to the JSON account
    #[account(0, writable, name="json_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="json_metadata_account", desc = "The account to store the json account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    AppendValue(AppendValueArgs),

    /// Add an authority to the JSON account
    #[account(0, writable, name="json_metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    AddAuthority(AddAuthorityArgs),

    /// Remove an authority from the JSON account
    #[account(0, writable, name="json_metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    RemoveAuthority(RemoveAuthorityArgs),
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct SetValueArgs {
    pub value: String,
}

#[repr(C)]
#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct AppendValueArgs {
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
