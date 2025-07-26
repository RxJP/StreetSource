// errors.rs
use actix_web::{error::ResponseError, http::StatusCode, HttpResponse};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Internal server error")]
    InternalError,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Password hash error")]
    PasswordHashError,

    #[error("AWS error: {0}")]
    AwsError(String),

    #[error("Invalid OTP")]
    InvalidOtp,

    #[error("OTP expired")]
    OtpExpired,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let status_code = self.status_code();
        let error_message = match self {
            AppError::DatabaseError(_) => "Database error occurred".to_string(),
            _ => self.to_string(),
        };

        HttpResponse::build(status_code).json(json!({
            "error": error_message,
            "code": status_code.as_u16()
        }))
    }

    fn status_code(&self) -> StatusCode {
        match self {
            AppError::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::PasswordHashError => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::AwsError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::InvalidOtp | AppError::OtpExpired => StatusCode::BAD_REQUEST,
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;