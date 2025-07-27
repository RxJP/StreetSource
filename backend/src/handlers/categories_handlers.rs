// handlers/categories_handlers.rs
use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::errors::AppResult;
use crate::models::Category;

pub async fn get_categories(
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    // Fetch all unique categories from products
    let categories = sqlx::query_as!(
        Category,
        r#"
        SELECT DISTINCT category_id as id, category_name as name
        FROM products
        WHERE stock_qty > 0
        ORDER BY category_name
        "#
    )
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "categories": categories
    })))
}

pub async fn get_category_by_id(
    pool: web::Data<PgPool>,
    path: web::Path<i32>,
) -> AppResult<HttpResponse> {
    let category_id = path.into_inner();
    
    // Fetch specific category with product count
    let category = sqlx::query!(
        r#"
        SELECT DISTINCT category_id, category_name, COUNT(*) as product_count
        FROM products
        WHERE category_id = $1 AND stock_qty > 0
        GROUP BY category_id, category_name
        "#,
        category_id
    )
    .fetch_optional(pool.get_ref())
    .await?;

    match category {
        Some(cat) => Ok(HttpResponse::Ok().json(json!({
            "id": cat.category_id,
            "name": cat.category_name,
            "product_count": cat.product_count
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Category not found or no products available"
        })))
    }
}