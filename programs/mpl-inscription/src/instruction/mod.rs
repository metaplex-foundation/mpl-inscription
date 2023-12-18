use borsh::{BorshDeserialize, BorshSerialize};
use shank::{ShankContext, ShankInstruction};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, ShankContext, ShankInstruction)]
#[rustfmt::skip]
pub enum MplInscriptionInstruction {
    /// Initialize the Inscription and Metadata accounts
    #[account(0, writable, signer, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, name="inscription_shard_account", desc="The shard account for the inscription counter.")]
    #[account(3, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(4, name="system_program", desc = "System program")]
    Initialize,

    /// Initialize the Inscription and Metadata accounts as a Mint PDA
    #[account(0, writable, name="mint_inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, name="mint_account", desc="The mint that will be used to derive the PDA.")]
    #[account(3, name="token_metadata_account", desc="The metadata for the mint.")]
    #[account(4, name="token_account", desc="The token account for the mint.")]
    #[account(5, writable, name="inscription_shard_account", desc="The shard account for the inscription counter.")]
    #[account(6, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(7, name="system_program", desc = "System program")]
    InitializeFromMint,

    /// Close the Inscription and Metadata accounts
    #[account(0, writable, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    Close,

    /// Write data to the inscription account
    #[account(0, writable, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    WriteData(WriteDataArgs),

    /// Clear the inscription account
    #[account(0, writable, name="inscription_account", desc = "The account to store the metadata in.")]
    #[account(1, writable, name="metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, name="system_program", desc = "System program")]
    ClearData,

    /// Add an update authority to the Inscription
    #[account(0, writable, name="metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    AddAuthority(AddAuthorityArgs),

    /// Remove an update authority from the Inscription account
    #[account(0, writable, name="metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="authority", desc="The authority paying and being removed.")]
    #[account(2, name="system_program", desc = "System program")]
    RemoveAuthority,

    /// Create an Inscription Shard account for counting inscriptions
    #[account(0, writable, name="shard_account", desc = "The account to store the shard data in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    CreateShard(CreateShardArgs),
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct WriteDataArgs {
    pub value: Vec<u8>,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct AddAuthorityArgs {
    pub new_authority: Pubkey,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct CreateShardArgs {
    pub shard_number: u8,
}
