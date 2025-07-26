// handlers/user_handlers.rs
use actix_identity::Identity;
use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::errors::{AppError, AppResult};
use crate::models::{PublicUser, UpdateProfileRequest, UpdateSettingsRequest};
use crate::utils::get_user_id;

pub async fn get_profile(
    identity: Identity,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    let user = sqlx::query_as!(
        PublicUser,
        r#"
        SELECT id, email, name, phone, is_supplier, rating, total_deliveries, profile_image_url
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(HttpResponse::Ok().json(user))
}

pub async fn update_profile(
    identity: Identity,
    pool: web::Data<PgPool>,
    req: web::Json<UpdateProfileRequest>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    sqlx::query!(
        r#"
        UPDATE users
        SET name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            profile_image_url = COALESCE($4, profile_image_url)
        WHERE id = $1
        "#,
        user_id,
        req.name,
        req.phone,
        req.profile_image_url
    )
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Profile updated successfully"
    })))
}

pub async fn get_settings(
    identity: Identity,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    let settings = sqlx::query!(
        "SELECT is_supplier FROM users WHERE id = $1",
        user_id
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(HttpResponse::Ok().json(json!({
        "is_supplier": settings.is_supplier
    })))
}

pub async fn update_settings(
    identity: Identity,
    pool: web::Data<PgPool>,
    req: web::Json<UpdateSettingsRequest>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    if let Some(become_supplier) = req.become_supplier {
        sqlx::query!(
            "UPDATE users SET is_supplier = $2 WHERE id = $1",
            user_id,
            become_supplier
        )
            .execute(pool.get_ref())
            .await?;
    }

    Ok(HttpResponse::Ok().json(json!({
        "message": "Settings updated successfully"
    })))
}