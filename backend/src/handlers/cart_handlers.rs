// handlers/cart_handlers.rs
use actix_identity::Identity;
use actix_session::Session;
use actix_web::{web, HttpResponse};
use bigdecimal::BigDecimal;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{AddToCartRequest, CartItem, RemoveFromCartRequest};

const CART_SESSION_KEY: &str = "cart";

pub async fn get_cart(
    identity: Identity,
    session: Session,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    if identity.id().is_err() {
        return Err(AppError::Unauthorized);
    }
    // Get cart from session
    let cart_items: Vec<CartItem> = session
        .get::<Vec<CartItem>>(CART_SESSION_KEY)
        .expect("Failed to get cart from session")
        .unwrap_or_default();

    // Fetch product details for cart items
    let product_ids: Vec<Uuid> = cart_items.iter().map(|item| item.product_id).collect();

    if product_ids.is_empty() {
        return Ok(HttpResponse::Ok().json(json!({
            "items": [],
            "total": 0.0
        })));
    }

    let products = sqlx::query!(
        r#"
        SELECT p.id, p.name, p.price_per_unit, p.image_url, p.stock_qty,
               u.name as seller_name
        FROM products p
        JOIN users u ON p.seller_id = u.id
        WHERE p.id = ANY($1)
        "#,
        &product_ids
    )
        .fetch_all(pool.get_ref())
        .await?;

    let mut cart_details = vec![];
    let mut total = BigDecimal::from(0);

    for item in &cart_items {
        if let Some(product) = products.iter().find(|p| p.id == item.product_id) {
            let subtotal = product.price_per_unit.clone() * item.quantity;
            total += subtotal.clone();

            cart_details.push(json!({
                "product_id": product.id,
                "name": product.name,
                "price_per_unit": product.price_per_unit,
                "quantity": item.quantity,
                "subtotal": subtotal,
                "image_url": product.image_url,
                "seller_name": product.seller_name,
                "available_stock": product.stock_qty
            }));
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "items": cart_details,
        "total": total
    })))
}

pub async fn add_to_cart(
    _identity: Identity, // Ensure user is logged in
    session: Session,
    pool: web::Data<PgPool>,
    req: web::Json<AddToCartRequest>,
) -> AppResult<HttpResponse> {
    // Verify product exists and has stock
    let product = sqlx::query!(
        "SELECT stock_qty FROM products WHERE id = $1",
        req.product_id
    )
        .fetch_optional(pool.get_ref())
        .await.expect("Failed to fetch product from database")
        .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    if product.stock_qty < req.quantity {
        return Err(AppError::BadRequest("Insufficient stock".to_string()));
    }

    // Get current cart
    let mut cart_items: Vec<CartItem> = session
        .get::<Vec<CartItem>>(CART_SESSION_KEY)
        .expect("Failed to get cart from session")
        .unwrap_or_default();

    // Update quantity if product already in cart
    if let Some(existing_item) = cart_items.iter_mut().find(|item| item.product_id == req.product_id) {
        existing_item.quantity += req.quantity;
    } else {
        cart_items.push(CartItem {
            product_id: req.product_id,
            quantity: req.quantity,
        });
    }

    // Save cart back to session
    session.insert(CART_SESSION_KEY, &cart_items)
        .expect("Failed to save cart to session");

    Ok(HttpResponse::Ok().json(json!({
        "message": "Item added to cart",
        "cart_size": cart_items.len()
    })))
}

pub async fn remove_from_cart(
    _identity: Identity,
    session: Session,
    req: web::Json<RemoveFromCartRequest>, // Reusing same struct
) -> AppResult<HttpResponse> {
    // Get current cart
    let mut cart_items: Vec<CartItem> = session
        .get::<Vec<CartItem>>(CART_SESSION_KEY)
        .expect("Failed to get cart from session")
        .unwrap_or_default();

    if req.quantity.is_none() {
        // Remove item from cart
        cart_items.retain(|item| item.product_id != req.product_id);
    }
    else {
        // Update quantity if item exists
        if let Some(item) = cart_items.iter_mut().find(|item| item.product_id == req.product_id) {
            if let Some(quantity) = req.quantity {
                if item.quantity > quantity {
                    item.quantity -= quantity;
                } else {
                    // If quantity is more than available, remove the item
                    cart_items.retain(|i| i.product_id != req.product_id);
                }
            }
        } else {
            return Err(AppError::NotFound("Item not found in cart".to_string()));
        }
    }

    // Save cart back to session
    session.insert(CART_SESSION_KEY, &cart_items)
        .expect("Failed to save cart to session");

    Ok(HttpResponse::Ok().json(json!({
        "message": "Item removed from cart",
        "cart_size": cart_items.len()
    })))
}