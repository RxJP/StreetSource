use actix_identity::IdentityMiddleware;
use actix_session::{SessionMiddleware, storage::CookieSessionStore};
use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_web::cookie::Key;
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use log::Level;

mod auth;
mod models;
mod handlers {
    pub mod auth_handlers;
    pub mod user_handlers;
    pub mod product_handlers;
    pub mod cart_handlers;
    pub mod order_handlers;
    pub mod message_handlers;
    pub mod upload_handlers;
    pub mod health_handler;
    pub mod categories_handlers;
}
mod errors;
mod ws;
mod utils;

use handlers::{auth_handlers, user_handlers, product_handlers, cart_handlers, order_handlers, message_handlers, categories_handlers};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let server_address = env::var("SERVER_ADDRESS").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let secret_key = env::var("SECRET_KEY").expect("SECRET_KEY must be set");

    // Create database pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    println!("Starting server at http://{}", server_address);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .wrap(Logger::default())
            .wrap(IdentityMiddleware::default())
            .wrap(
                SessionMiddleware::builder(
                    CookieSessionStore::default(),
                    Key::from(secret_key.as_bytes())
                )
                    .cookie_secure(false) // Set to true in production with HTTPS
                    .build()
            )
            // Auth routes
            .service(
                web::scope("/api")
                    .route("/register", web::post().to(auth_handlers::register))
                    .route("/login", web::post().to(auth_handlers::login))
                    .route("/logout", web::post().to(auth_handlers::logout))
                    .route("/password_reset/request", web::post().to(auth_handlers::request_password_reset))
                    .route("/password_reset/verify", web::post().to(auth_handlers::verify_password_reset))
                    // User routes
                    .route("/user/profile", web::get().to(user_handlers::get_profile))
                    .route("/user/profile", web::put().to(user_handlers::update_profile))
                    .route("/user/settings", web::get().to(user_handlers::get_settings))
                    .route("/user/settings", web::put().to(user_handlers::update_settings))
                    // Category routes
                    .route("/categories", web::get().to(categories_handlers::get_categories))
                    .route("/categories/{id}", web::get().to(categories_handlers::get_category_by_id))
                    // Product routes
                    .route("/products", web::get().to(product_handlers::list_products))
                    .route("/products", web::post().to(product_handlers::create_product))
                    .route("/products/{id}", web::get().to(product_handlers::get_product))
                    .route("/products/{id}", web::put().to(product_handlers::update_product))
                    .route("/products/{id}", web::delete().to(product_handlers::delete_product))
                    // Cart routes
                    .route("/cart", web::get().to(cart_handlers::get_cart))
                    .route("/cart/add", web::post().to(cart_handlers::add_to_cart))
                    .route("/cart/remove", web::post().to(cart_handlers::remove_from_cart))
                    // Order routes
                    .route("/orders", web::get().to(order_handlers::get_orders))
                    .route("/orders", web::post().to(order_handlers::create_order))
                    .route("/orders/seller/pending", web::get().to(order_handlers::get_seller_pending_orders))
                    .route("/orders/{id}/status", web::put().to(order_handlers::update_order_status))
                    // Message routes
                    .route("/conversations", web::get().to(message_handlers::get_conversations))
                    .route("/messages/{conv_id}", web::get().to(message_handlers::get_messages))
                    // Upload routes
                    .route("/upload/profile", web::post().to(handlers::upload_handlers::upload_profile_image))
                    .route("/upload/product", web::post().to(handlers::upload_handlers::upload_product_image))
            )
            // WebSocket endpoint
            .route("/ws/messages", web::get().to(ws::websocket_handler))
            //Health Check endpoint
            .route("/health", web::get().to(handlers::health_handler::health_check))
    })
        .bind(&server_address)?
        .run()
        .await
}
