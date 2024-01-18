use borsh::{BorshDeserialize, BorshSerialize};
use shank::{ShankContext, ShankInstruction};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, ShankContext, ShankInstruction)]
#[rustfmt::skip]
pub enum MplInscriptionInstruction {
    /// Initialize the Inscription and Metadata accounts.
    #[account(0, writable, signer, name="inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, name="inscription_shard_account", desc="The shard account for the inscription counter.")]
    #[account(3, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(4, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(5, name="system_program", desc = "System program")]
    Initialize,

    /// Initialize the Inscription and Metadata accounts as a Mint PDA.
    #[account(0, writable, name="mint_inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, name="mint_account", desc="The mint that will be used to derive the PDA.")]
    #[account(3, name="token_metadata_account", desc="The metadata for the mint.")]
    #[account(4, writable, name="inscription_shard_account", desc="The shard account for the inscription counter.")]
    #[account(5, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(6, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(7, name="system_program", desc = "System program")]
    InitializeFromMint,

    /// Close the Inscription and Metadata accounts.
    #[account(0, writable, name="inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(4, name="system_program", desc = "System program")]
    Close(CloseArgs),

    /// Write data to the inscription account.
    #[account(0, writable, name="inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(4, name="system_program", desc = "System program")]
    WriteData(WriteDataArgs),

    /// Clear the inscription account.
    #[account(0, writable, name="inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(4, name="system_program", desc = "System program")]
    ClearData(ClearDataArgs),

    /// Add an update authority to the Inscription.
    #[account(0, writable, name="inscription_metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(3, name="system_program", desc = "System program")]
    AddAuthority(AddAuthorityArgs),

    /// Remove an update authority from the Inscription account.
    #[account(0, writable, name="inscription_metadata_account", desc = "The account to store the metadata's metadata in.")]
    #[account(1, writable, signer, name="payer", desc="The account paying for the transaction and rent.")]
    #[account(2, optional, signer, name="authority", desc="The authority of the inscription account to be removed.")]
    #[account(3, name="system_program", desc = "System program")]
    RemoveAuthority,

    /// Create an Inscription Shard account for counting inscriptions.
    #[account(0, writable, name="shard_account", desc = "The account to store the shard data in.")]
    #[account(1, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(2, name="system_program", desc = "System program")]
    CreateShard(CreateShardArgs),

    /// Initialize the Inscription and Metadata accounts.
    #[account(0, name="inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, name="associated_inscription_account", desc = "The account to create and store the new associated data in.")]
    #[account(3, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(4, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(5, name="system_program", desc = "System program")]
    InitializeAssociatedInscription(AssociateInscriptionAccountArgs),

    /// Allocate additional space for the inscription account.
    #[account(0, writable, name="inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(3, optional, signer, name="authority", desc="The authority of the inscription account.")]
    #[account(4, name="system_program", desc = "System program")]
    Allocate(AllocateArgs),

    /// Set the mint for the inscription metadata account.
    #[account(0, name="mint_inscription_account", desc = "The account where data is stored.")]
    #[account(1, writable, name="inscription_metadata_account", desc = "The account to store the inscription account's metadata in.")]
    #[account(2, name="mint_account", desc="The mint that will be used to derive the PDA.")]
    #[account(3, writable, signer, name="payer", desc="The account that will pay for the transaction and rent.")]
    #[account(4, name="system_program", desc = "System program")]
    SetMint,

    /// Initialize a Collection from the Inscription content.
    #[account(0, writable, name="collection_metadata", desc = "The Collection Metadata account.")]
    #[account(1, writable, name="collection_master_edition", desc = "The master edition of the Collection NFT.")]
    #[account(2, writable, name="collection_mint", desc="The mint for the Collection NFT.")]
    #[account(3, writable, name="collection_token_account", desc = "The token account for the Collection NFT.")]
    #[account(4, name="sysvar_instructions", desc = "The instructions sysvar.")]
    #[account(5, name="spl_token_program", desc = "The token program.")]
    #[account(6, name="spl_ata_program", desc = "The ATA Program.")]
    #[account(8, name="mpl_token_metadata", desc = "The token metadata program.")]
    #[account(7, name="system_program", desc = "System program")]
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct CloseArgs {
    pub associated_tag: Option<String>,
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct WriteDataArgs {
    pub associated_tag: Option<String>,
    pub offset: usize,
    pub value: Vec<u8>,
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct ClearDataArgs {
    pub associated_tag: Option<String>,
}

#[repr(C)]
#[derive(PartialEq, Eq, Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct AllocateArgs {
    pub associated_tag: Option<String>,
    pub target_size: usize,
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

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct AssociateInscriptionAccountArgs {
    pub association_tag: String,
}
