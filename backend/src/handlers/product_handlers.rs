// handlers/product_handlers.rs
use actix_identity::Identity;
use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{CreateProductRequest, ProductQuery, ProductWithSeller, UpdateProductRequest};
use crate::utils::get_user_id;

pub async fn list_products(
    pool: web::Data<PgPool>,
    query: web::Query<ProductQuery>,
) -> AppResult<HttpResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    // Build dynamic query based on filters
    let mut sql = r#"
        SELECT
            p.id, p.name, p.description, p.price_per_unit, p.stock_qty,
            p.image_url, p.seller_id, p.category_id, p.created_at,
            c.name as category_name,
            u.name as seller_name, u.name as seller_company,
            u.rating as seller_rating, u.total_deliveries as seller_deliveries
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN users u ON p.seller_id = u.id
        WHERE p.stock_qty > 0
    "#.to_string();

    // Add search filter
    if let Some(search) = &query.search {
        sql.push_str(&format!(" AND (p.name ILIKE '%{}%' OR p.description ILIKE '%{}%')", search, search));
    }

    // Add category filter
    if let Some(category_id) = query.category {
        if category_id > 0 {
            sql.push_str(&format!(" AND p.category_id = {}", category_id));
        }
    }

    // Add sorting
    let order_clause = match query.sort.as_deref() {
        Some("price_asc") => " ORDER BY p.price_per_unit ASC",
        Some("price_desc") => " ORDER BY p.price_per_unit DESC",
        Some("rating") => " ORDER BY u.rating DESC NULLS LAST",
        Some("deliveries") => " ORDER BY u.total_deliveries DESC",
        Some("name") => " ORDER BY p.name ASC",
        _ => " ORDER BY p.created_at DESC",
    };
    sql.push_str(order_clause);

    // Add pagination
    sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    let products: Vec<ProductWithSeller> = sqlx::query_as(&sql)
        .fetch_all(pool.get_ref())
        .await?;

    // Get total count for pagination
    let count_sql = r#"
        SELECT COUNT(*) as count
        FROM products p
        WHERE p.stock_qty > 0
    "#;

    let total_count: i64 = sqlx::query_scalar(count_sql)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "products": products,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count as f64 / limit as f64).ceil() as i32
        }
    })))
}

pub async fn get_product(
    pool: web::Data<PgPool>,
    product_id: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let product = sqlx::query_as!(
        ProductWithSeller,
        r#"
        SELECT
            p.id, p.name, p.description, p.price_per_unit, p.stock_qty,
            p.image_url, p.seller_id, p.category_id, p.created_at,
            c.name as category_name,
            u.name as seller_name, u.name as seller_company,
            u.rating as seller_rating, u.total_deliveries as seller_deliveries
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN users u ON p.seller_id = u.id
        WHERE p.id = $1
        "#,
        product_id.into_inner()
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    Ok(HttpResponse::Ok().json(product))
}

pub async fn create_product(
    identity: Identity,
    pool: web::Data<PgPool>,
    req: web::Json<CreateProductRequest>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    // Check if user is a supplier
    let is_supplier = sqlx::query_scalar!(
        "SELECT is_supplier FROM users WHERE id = $1",
        user_id
    )
        .fetch_one(pool.get_ref())
        .await?;

    if !is_supplier {
        return Err(AppError::Forbidden);
    }

    let product_id = Uuid::new_v4();

    let product = sqlx::query!(
        r#"
        INSERT INTO products (id, name, description, price_per_unit, stock_qty, image_url, seller_id, category_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        "#,
        product_id,
        req.name,
        req.description,
        req.price_per_unit,
        req.stock_qty,
        req.image_url,
        user_id,
        req.category_id
    )
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Created().json(json!({
        "message": "Product created successfully",
        "product_id": product.id
    })))
}

pub async fn update_product(
    identity: Identity,
    pool: web::Data<PgPool>,
    product_id: web::Path<Uuid>,
    req: web::Json<UpdateProductRequest>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;
    let product_id = product_id.into_inner();

    // Check if user owns the product
    let seller_id = sqlx::query_scalar!(
        "SELECT seller_id FROM products WHERE id = $1",
        product_id
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    if seller_id != user_id {
        return Err(AppError::Forbidden);
    }

    // Build dynamic update query
    let mut query_parts = vec![];
    let mut param_count = 2; // Starting from $2 since $1 is product_id

    if req.name.is_some() {
        query_parts.push(format!("name = ${}", param_count));
        param_count += 1;
    }
    if req.description.is_some() {
        query_parts.push(format!("description = ${}", param_count));
        param_count += 1;
    }
    if req.price_per_unit.is_some() {
        query_parts.push(format!("price_per_unit = ${}", param_count));
        param_count += 1;
    }
    if req.stock_qty.is_some() {
        query_parts.push(format!("stock_qty = ${}", param_count));
        param_count += 1;
    }
    if req.category_id.is_some() {
        query_parts.push(format!("category_id = ${}", param_count));
        param_count += 1;
    }
    if req.image_url.is_some() {
        query_parts.push(format!("image_url = ${}", param_count));
    }

    if query_parts.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    let update_query = format!(
        "UPDATE products SET {} WHERE id = $1",
        query_parts.join(", ")
    );

    // Execute with dynamic parameters
    let mut query = sqlx::query(&update_query).bind(product_id);

    if let Some(ref name) = req.name {
        query = query.bind(name);
    }
    if let Some(ref desc) = req.description {
        query = query.bind(desc);
    }
    if let Some(price) = &req.price_per_unit {
        query = query.bind(price);
    }
    if let Some(qty) = req.stock_qty {
        query = query.bind(qty);
    }
    if let Some(cat_id) = req.category_id {
        query = query.bind(cat_id);
    }
    if let Some(ref img) = req.image_url {
        query = query.bind(img);
    }

    query.execute(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Product updated successfully"
    })))
}

pub async fn delete_product(
    identity: Identity,
    pool: web::Data<PgPool>,
    product_id: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;
    let product_id = product_id.into_inner();

    // Check if user owns the product
    let seller_id = sqlx::query_scalar!(
        "SELECT seller_id FROM products WHERE id = $1",
        product_id
    )
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    if seller_id != user_id {
        return Err(AppError::Forbidden);
    }

    // Soft delete by setting stock to 0
    sqlx::query!(
        "UPDATE products SET stock_qty = 0 WHERE id = $1",
        product_id
    )
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Product deleted successfully"
    })))
}