use bigdecimal::BigDecimal;
// models.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// User model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub is_supplier: bool,
    pub rating: Option<f64>,
    pub total_deliveries: i32,
    pub profile_image_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

// Public user info (without sensitive data)
#[derive(Debug, Serialize, Deserialize)]
pub struct PublicUser {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub is_supplier: bool,
    pub rating: Option<f64>,
    pub total_deliveries: i32,
    pub profile_image_url: Option<String>,
}

// Category model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: i32,
    pub name: String,
}

// Product model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub price_per_unit: BigDecimal,
    pub stock_qty: i32,
    pub image_url: Option<String>,
    pub seller_id: Uuid,
    pub category_id: i32,
    pub created_at: DateTime<Utc>,
}

// Product with seller info
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductWithSeller {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub price_per_unit: BigDecimal,
    pub stock_qty: i32,
    pub image_url: Option<String>,
    pub seller_id: Uuid,
    pub category_id: i32,
    pub category_name: String,
    pub seller_name: Option<String>,
    pub seller_company: Option<String>,
    pub seller_rating: Option<f64>,
    pub seller_deliveries: i32,
    pub created_at: DateTime<Utc>,
}

// Order model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub buyer_id: Uuid,
    pub seller_id: Uuid,
    pub status: OrderStatus,
    pub total_price: f64,
    pub created_at: DateTime<Utc>,
}

// Order status enum
#[derive(Debug, Serialize, Deserialize, sqlx::Type, Clone)]
#[sqlx(type_name = "order_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Pending,
    Shipped,
    Delivered,
}

// Order item model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub product_id: Uuid,
    pub quantity: i32,
    pub unit_price: f64,
}

// Cart item model
#[derive(Debug, Serialize, Deserialize)]
pub struct CartItem {
    pub product_id: Uuid,
    pub quantity: i32,
}

// Conversation model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Conversation {
    pub id: Uuid,
    pub user1_id: Uuid,
    pub user2_id: Uuid,
    pub last_updated: DateTime<Utc>,
}

// Message model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub conv_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: DateTime<Utc>,
}

// Special offer message content
#[derive(Debug, Serialize, Deserialize)]
pub struct OfferContent {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub price: f64,
    pub qty: i32,
}

// Password reset model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PasswordReset {
    pub id: Uuid,
    pub user_id: Uuid,
    pub otp_code: String,
    pub expires_at: DateTime<Utc>,
}

// Request/Response DTOs
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub is_supplier: bool,
    pub name: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct PasswordResetRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct PasswordResetVerify {
    pub email: String,
    pub otp: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: Option<String>,
    pub price_per_unit: BigDecimal,
    pub stock_qty: i32,
    pub category_id: i32,
    pub image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub price_per_unit: Option<BigDecimal>,
    pub stock_qty: Option<i32>,
    pub category_id: Option<i32>,
    pub image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub search: Option<String>,
    pub category: Option<i32>,
    pub sort: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct AddToCartRequest {
    pub product_id: Uuid,
    pub quantity: i32,
}

#[derive(Debug, Deserialize)]
pub struct RemoveFromCartRequest {
    pub product_id: Uuid,
    pub quantity: Option<i32>,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateOrderStatusRequest {
    pub status: OrderStatus,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub profile_image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub become_supplier: Option<bool>,
}

// WebSocket message types
#[derive(Debug, Serialize, Deserialize)]
pub struct WsMessage {
    pub conv_id: Uuid,
    pub content: String,
    pub sender_id: Uuid,
    pub sent_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryWithCount {
    pub id: i32,
    pub name: String,
    pub product_count: i64,
}