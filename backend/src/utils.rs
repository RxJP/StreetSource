// utils.rs
use actix_identity::Identity;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};

/// Extract user ID from Identity
pub fn get_user_id(identity: &Identity) -> AppResult<Uuid> {
    let user_id_str = identity
        .id()
        .map_err(|_| AppError::Unauthorized)?;

    Uuid::parse_str(&user_id_str)
        .map_err(|_| AppError::Unauthorized)
}

/// Extract user ID from Identity, returning Option
pub fn get_user_id_opt(identity: &Identity) -> AppResult<Option<Uuid>> {
    match identity.id() {
        Ok(user_id_str) => {
            match Uuid::parse_str(&user_id_str) {
                Ok(uuid) => Ok(Some(uuid)),
                Err(_) => Ok(None),
            }
        }
        Err(_) => Ok(None),
    }
}

/// Validate email format
pub fn validate_email(email: &str) -> bool {
    // Simple email validation
    let email_regex = regex::Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    email_regex.is_match(email)
}

/// Sanitize phone number
pub fn sanitize_phone(phone: &str) -> String {
    // Remove all non-digit characters
    phone.chars().filter(|c| c.is_numeric()).collect()
}

/// Generate a random alphanumeric string
pub fn generate_random_string(length: usize) -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();

    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}