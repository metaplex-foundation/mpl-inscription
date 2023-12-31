mod generated;
#[path = "./generated/instructions/initialize.rs"]
mod initialize;
#[path = "./generated/instructions/initialize_from_mint.rs"]
mod initialize_from_mint;

pub use generated::programs::MPL_INSCRIPTION_ID as ID;
pub use generated::*;
pub use initialize::*;
pub use initialize_from_mint::*;
