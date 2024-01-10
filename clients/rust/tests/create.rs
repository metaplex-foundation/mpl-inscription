#![cfg(feature = "test-sbf")]

use borsh::BorshDeserialize;
use mpl_inscription::{accounts::MyAccount, instructions::CreateBuilder};
use solana_program_test::{tokio, ProgramTest};
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};

#[tokio::test]
async fn create() {
    let mut context = ProgramTest::new("mpl_inscription", mpl_inscription::ID, None)
        .start_with_context()
        .await;

    // Given a new keypair.

    let address = Keypair::new();
}
