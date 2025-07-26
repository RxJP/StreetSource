// handlers/order_handlers.rs
use actix_identity::Identity;
use actix_session::Session;
use actix_web::{web, HttpResponse};
use bigdecimal::BigDecimal;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{CartItem, OrderStatus, UpdateOrderStatusRequest};
use crate::utils::get_user_id;

const CART_SESSION_KEY: &str = "cart";

pub async fn create_order(
    identity: Identity,
    session: Session,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    let buyer_id = get_user_id(&identity).expect("Failed to get user ID from identity");

    // Get cart from session
    let cart_items: Vec<CartItem> = session
        .get::<Vec<CartItem>>(CART_SESSION_KEY)
        .expect("Failed to get cart from session")
        .unwrap_or_default();

    if cart_items.is_empty() {
        return Err(AppError::BadRequest("Cart is empty".to_string()));
    }

    // Group items by seller
    let product_ids: Vec<Uuid> = cart_items.iter().map(|item| item.product_id).collect();

    let products = sqlx::query!(
        r#"
        SELECT id, seller_id, price_per_unit, stock_qty
        FROM products
        WHERE id = ANY($1)
        "#,
        &product_ids
    )
        .fetch_all(pool.get_ref())
        .await.expect("Failed to fetch products from database");

    // Group by seller
    let mut orders_by_seller: std::collections::HashMap<Uuid, Vec<(Uuid, i32, BigDecimal)>> =
        std::collections::HashMap::new();

    for item in &cart_items {
        if let Some(product) = products.iter().find(|p| p.id == item.product_id) {
            if product.stock_qty < item.quantity {
                return Err(AppError::BadRequest(format!(
                    "Insufficient stock for product {}",
                    product.id
                )));
            }

            orders_by_seller
                .entry(product.seller_id)
                .or_insert_with(Vec::new)
                .push((product.id, item.quantity, product.price_per_unit.clone()));
        }
    }

    // Begin transaction
    let mut tx = pool.begin().await.expect("Failed to begin database transaction");

    let mut created_orders = vec![];

    // Create orders for each seller
    for (seller_id, items) in orders_by_seller {
        let order_id = Uuid::new_v4();
        let total_price: BigDecimal = items.iter().map(|(_, qty, price)| *qty * price).sum();

        // Create order
        sqlx::query!(
            r#"
            INSERT INTO orders (id, buyer_id, seller_id, status, total_price)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            order_id,
            buyer_id,
            seller_id,
            OrderStatus::Pending as OrderStatus,
            total_price
        )
            .execute(&mut *tx)
            .await
            .expect("Failed to insert order into database");

        // Create order items
        for (product_id, quantity, unit_price) in &items {
            let item_id = Uuid::new_v4();

            sqlx::query!(
                r#"
                INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
                VALUES ($1, $2, $3, $4, $5)
                "#,
                item_id,
                order_id,
                product_id,
                quantity,
                unit_price
            )
                .execute(&mut *tx)
                .await
                .expect("Failed to insert order item into database");

            // Update product stock
            sqlx::query!(
                "UPDATE products SET stock_qty = stock_qty - $2 WHERE id = $1",
                product_id,
                quantity
            )
                .execute(&mut *tx)
                .await
                .expect("Failed to update product stock");
        }

        created_orders.push(order_id);
    }

    // Commit transaction
    tx.commit().await.expect("Failed to commit database transaction");

    // Clear cart
    session.remove(CART_SESSION_KEY);

    Ok(HttpResponse::Created().json(json!({
        "message": "Orders created successfully",
        "order_ids": created_orders
    })))
}

pub async fn get_orders(
    identity: Identity,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity).expect("Failed to get user ID from identity");

    let orders = sqlx::query!(
        r#"
        SELECT o.id, o.seller_id, o.status as "status: OrderStatus",
               o.total_price, o.created_at,
               u.name as seller_name
        FROM orders o
        JOIN users u ON o.seller_id = u.id
        WHERE o.buyer_id = $1
        ORDER BY o.created_at DESC
        "#,
        user_id
    )
        .fetch_all(pool.get_ref())
        .await.expect("Failed to fetch orders from database");

    let mut order_details = vec![];

    for order in orders {
        // Get order items
        let items = sqlx::query!(
            r#"
            SELECT oi.product_id, oi.quantity, oi.unit_price,
                   p.name as product_name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
            "#,
            order.id
        )
            .fetch_all(pool.get_ref())
            .await.expect("Failed to fetch order items from database");

        order_details.push(json!({
            "id": order.id,
            "seller_id": order.seller_id,
            "seller_name": order.seller_name,
            "status": order.status,
            "total_price": order.total_price,
            "created_at": order.created_at,
            "items": items.iter().map(|item| json!({
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "image_url": item.image_url
            })).collect::<Vec<_>>()
        }));
    }

    Ok(HttpResponse::Ok().json(json!({
        "orders": order_details
    })))
}

pub async fn get_seller_pending_orders(
    identity: Identity,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    let seller_id = get_user_id(&identity).expect("Failed to get user ID from identity");

    // Check if user is a supplier
    let is_supplier = sqlx::query_scalar!(
        "SELECT is_supplier FROM users WHERE id = $1",
        seller_id
    )
        .fetch_one(pool.get_ref())
        .await.expect("Failed to fetch supplier status from database");

    if !is_supplier {
        return Err(AppError::Forbidden);
    }

    let orders = sqlx::query!(
        r#"
        SELECT o.id, o.buyer_id, o.status as "status: OrderStatus",
               o.total_price, o.created_at,
               u.name as buyer_name, u.phone as buyer_phone
        FROM orders o
        JOIN users u ON o.buyer_id = u.id
        WHERE o.seller_id = $1 AND o.status = $2
        ORDER BY o.created_at DESC
        "#,
        seller_id,
        OrderStatus::Pending as OrderStatus
    )
        .fetch_all(pool.get_ref())
        .await.expect("Failed to fetch seller pending orders from database");

    let mut order_details = vec![];

    for order in orders {
        // Get order items
        let items = sqlx::query!(
            r#"
            SELECT oi.product_id, oi.quantity, oi.unit_price,
                   p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
            "#,
            order.id
        )
            .fetch_all(pool.get_ref())
            .await.expect("Failed to fetch seller order items from database");

        order_details.push(json!({
            "id": order.id,
            "buyer_id": order.buyer_id,
            "buyer_name": order.buyer_name,
            "buyer_phone": order.buyer_phone,
            "status": order.status,
            "total_price": order.total_price,
            "created_at": order.created_at,
            "items": items.iter().map(|item| json!({
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price
            })).collect::<Vec<_>>()
        }));
    }

    Ok(HttpResponse::Ok().json(json!({
        "orders": order_details
    })))
}

pub async fn update_order_status(
    identity: Identity,
    pool: web::Data<PgPool>,
    order_id: web::Path<Uuid>,
    req: web::Json<UpdateOrderStatusRequest>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity).expect("Failed to get user ID from identity");
    let order_id = order_id.into_inner();

    // Check if user is the seller of this order
    let order = sqlx::query!(
        "SELECT seller_id, status as \"status: OrderStatus\" FROM orders WHERE id = $1",
        order_id
    )
        .fetch_optional(pool.get_ref())
        .await.expect("Failed to fetch order from database")
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    if order.seller_id != user_id {
        return Err(AppError::Forbidden);
    }

    // Update order status
    sqlx::query!(
        "UPDATE orders SET status = $2 WHERE id = $1",
        order_id,
        req.status.clone() as OrderStatus
    )
        .execute(pool.get_ref())
        .await
        .expect("Failed to update order status");

    // If order is completed, update seller's total deliveries
    if matches!(req.status, OrderStatus::Delivered) {
        sqlx::query!(
            "UPDATE users SET total_deliveries = total_deliveries + 1 WHERE id = $1",
            user_id
        )
            .execute(pool.get_ref())
            .await
            .expect("Failed to update seller's total deliveries");
    }

    Ok(HttpResponse::Ok().json(json!({
        "message": "Order status updated successfully"
    })))
}