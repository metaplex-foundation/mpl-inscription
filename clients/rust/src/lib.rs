mod generated;
#[path = "./generated/instructions/initialize.rs"]
mod initialize;
#[path = "./generated/instructions/initialize_from_mint.rs"]
mod initialize_from_mint;

pub use generated::programs::MPL_INSCRIPTION_ID as ID;
pub use generated::*;

mod manual {
    pub mod instructions {
        pub(crate) mod initialize {
            pub use crate::initialize::*;
        }
        pub(crate) mod initialize_from_mint {
            pub use crate::initialize_from_mint::*;
        }
    }
}
pub use manual::*;
// pub use initialize::*;
// pub use initialize_from_mint::*;
