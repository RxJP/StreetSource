// handlers/auth_handlers.rs
use actix_identity::Identity;
use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use chrono::{Duration, Utc};
use rand::Rng;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{LoginRequest, PasswordResetRequest, PasswordResetVerify, RegisterRequest, User};

pub async fn register(
    pool: web::Data<PgPool>,
    req: web::Json<RegisterRequest>,
) -> AppResult<HttpResponse> {
    // Check if email already exists
    let existing = sqlx::query!(
        "SELECT id FROM users WHERE email = $1",
        req.email
    )
        .fetch_optional(pool.get_ref())
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|_| AppError::PasswordHashError)?
        .to_string();

    // Create user
    let user_id = Uuid::new_v4();
    let _user = sqlx::query!(
        r#"
        INSERT INTO users (id, email, password_hash, name, phone, is_supplier, rating, total_deliveries)
        VALUES ($1, $2, $3, $4, $5, $6, NULL, 0)
        "#,
        user_id,
        req.email,
        password_hash,
        req.name,
        req.phone,
        req.is_supplier
    )
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Created().json(json!({
        "message": "Registration successful",
        "user_id": user_id
    })))
}

pub async fn login(
    request: HttpRequest,
    pool: web::Data<PgPool>,
    req: web::Json<LoginRequest>,
) -> AppResult<HttpResponse> {
    // Find user by email
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE email = $1",
        req.email
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::Unauthorized)?;

    // Verify password
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::PasswordHashError)?;

    let argon2 = Argon2::default();
    argon2
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    // Create session
    Identity::login(&request.extensions(), user.id.to_string()).unwrap();

    Ok(HttpResponse::Ok().json(json!({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "is_supplier": user.is_supplier
        }
    })))
}

pub async fn logout(user: Identity) -> AppResult<HttpResponse> {
    user.logout();
    Ok(HttpResponse::Ok().json(json!({
        "message": "Logout successful"
    })))
}

pub async fn request_password_reset(
    pool: web::Data<PgPool>,
    req: web::Json<PasswordResetRequest>,
) -> AppResult<HttpResponse> {
    // Find user by email
    let user = sqlx::query!(
        "SELECT id FROM users WHERE email = $1",
        req.email
    )
        .fetch_optional(pool.get_ref())
        .await?;

    if let Some(user_record) = user {
        // Generate 6-digit OTP
        let otp: String = (0..6)
            .map(|_| rand::thread_rng().gen_range(0..10).to_string())
            .collect();

        // Set expiry to 15 minutes from now
        let expires_at = Utc::now() + Duration::minutes(15);

        // Delete any existing OTP for this user
        sqlx::query!(
            "DELETE FROM password_resets WHERE user_id = $1",
            user_record.id
        )
            .execute(pool.get_ref())
            .await?;

        // Store OTP
        sqlx::query!(
            r#"
            INSERT INTO password_resets (id, user_id, otp_code, expires_at)
            VALUES ($1, $2, $3, $4)
            "#,
            Uuid::new_v4(),
            user_record.id,
            otp,
            expires_at
        )
            .execute(pool.get_ref())
            .await?;

        // TODO: Send OTP via email (AWS SES or SMTP)
        // For now, we'll just log it (remove in production)
        log::info!("Password reset OTP for {}: {}", req.email, otp);
    }

    // Always return success to avoid email enumeration
    Ok(HttpResponse::Ok().json(json!({
        "message": "If the email exists, a password reset code has been sent"
    })))
}

pub async fn verify_password_reset(
    pool: web::Data<PgPool>,
    req: web::Json<PasswordResetVerify>,
) -> AppResult<HttpResponse> {
    // Find user by email
    let user = sqlx::query!(
        "SELECT id FROM users WHERE email = $1",
        req.email
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Find valid OTP
    let reset = sqlx::query!(
        r#"
        SELECT id, otp_code, expires_at
        FROM password_resets
        WHERE user_id = $1 AND otp_code = $2
        "#,
        user.id,
        req.otp
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::InvalidOtp)?;

    // Check if OTP is expired
    if reset.expires_at < Utc::now() {
        return Err(AppError::OtpExpired);
    }

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.new_password.as_bytes(), &salt)
        .map_err(|_| AppError::PasswordHashError)?
        .to_string();

    // Update password
    sqlx::query!(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        password_hash,
        user.id
    )
        .execute(pool.get_ref())
        .await?;

    // Delete used OTP
    sqlx::query!(
        "DELETE FROM password_resets WHERE id = $1",
        reset.id
    )
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Password reset successful"
    })))
}