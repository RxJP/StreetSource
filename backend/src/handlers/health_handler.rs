// handlers/health_handler.rs
use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;

use crate::errors::AppResult;

pub async fn health_check(pool: web::Data<PgPool>) -> AppResult<HttpResponse> {
    // Check database connectivity
    let db_status = match sqlx::query!("SELECT 1 as health")
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    Ok(HttpResponse::Ok().json(json!({
        "status": if db_status == "healthy" { "healthy" } else { "degraded" },
        "timestamp": Utc::now(),
        "services": {
            "database": db_status,
            "api": "healthy"
        }
    })))
}