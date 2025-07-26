// ws.rs
use actix_identity::Identity;
use actix_web::{web, HttpRequest, HttpResponse};
use actix_ws::{Message, MessageStream, Session};
use futures_util::StreamExt;
use serde_json::json;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::handlers::message_handlers::{get_or_create_conversation, save_message};
use crate::models::{OfferContent, WsMessage};
use crate::utils::get_user_id_opt;

type UserSessions = Arc<Mutex<HashMap<Uuid, mpsc::UnboundedSender<String>>>>;

// Global sessions storage - in production, use a proper state management solution
static SESSIONS: std::sync::OnceLock<UserSessions> = std::sync::OnceLock::new();

fn get_sessions() -> &'static UserSessions {
    SESSIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    pool: web::Data<PgPool>,
    identity: Option<Identity>,
) -> AppResult<HttpResponse> {
    // Get user ID from identity
    let user_id = match identity {
        Some(id) => get_user_id_opt(&id).expect("Failed to get user ID from identity"),
        None => return Err(AppError::Unauthorized),
    };

    let user_id = match user_id {
        Some(id) => id,
        None => return Err(AppError::Unauthorized),
    };

    // Upgrade to WebSocket
    let (response, mut session, msg_stream) = actix_ws::handle(&req, stream).expect("WebSocket upgrade failed");

    // Create channel for this user
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Register session
    {
        let mut sessions = get_sessions().lock().expect("Failed to lock sessions mutex");
        sessions.insert(user_id, tx);
    }

    // Spawn handler for this connection
    let pool_clone = pool.get_ref().clone();
    actix_web::rt::spawn(async move {
        let _ = handle_websocket(
            user_id,
            &mut session,
            msg_stream,
            &mut rx,
            pool_clone,
        ).await;

        // Remove session on disconnect
        let mut sessions = get_sessions().lock().expect("Failed to lock sessions mutex");
        sessions.remove(&user_id);
    });

    Ok(response)
}

async fn handle_websocket(
    user_id: Uuid,
    session: &mut Session,
    mut msg_stream: MessageStream,
    rx: &mut mpsc::UnboundedReceiver<String>,
    pool: PgPool,
) -> Result<(), Box<dyn std::error::Error>> {
    loop {
        tokio::select! {
            // Handle incoming messages from client
            Some(msg) = msg_stream.next() => {
                match msg? {
                    Message::Text(text) => {
                        if let Err(e) = handle_client_message(user_id, &text, &pool).await {
                            let error_msg = json!({
                                "type": "error",
                                "message": e.to_string()
                            });
                            session.text(error_msg.to_string()).await?;
                        }
                    }
                    Message::Close(_) => {
                        break;
                    }
                    _ => {}
                }
            }

            // Handle messages to send to client
            Some(msg) = rx.recv() => {
                session.text(msg).await?;
            }

            else => break
        }
    }

    Ok(())
}

async fn handle_client_message(
    sender_id: Uuid,
    message: &str,
    pool: &PgPool,
) -> AppResult<()> {
    // Parse message
    let msg_data: serde_json::Value = serde_json::from_str(message)
        .map_err(|_| AppError::BadRequest("Invalid message format".to_string()))?;

    let receiver_id = msg_data["receiver_id"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::BadRequest("Missing receiver_id".to_string()))?;

    let content = msg_data["content"]
        .as_str()
        .ok_or_else(|| AppError::BadRequest("Missing content".to_string()))?;

    // Get or create conversation
    let conv_id = get_or_create_conversation(pool, sender_id, receiver_id).await?;

    // Save message to database
    let saved_message = save_message(pool, conv_id, sender_id, content).await?;

    // Get sender name
    let sender_name = sqlx::query_scalar!(
        "SELECT name FROM users WHERE id = $1",
        sender_id
    )
        .fetch_one(pool)
        .await?;

    // Prepare message to send
    let ws_message = json!({
        "type": "message",
        "id": saved_message.id,
        "conv_id": conv_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "content": content,
        "sent_at": saved_message.sent_at
    });

    // Send to receiver if online
    {
        let sessions = get_sessions().lock().unwrap();
        if let Some(tx) = sessions.get(&receiver_id) {
            let _ = tx.send(ws_message.to_string());
        }
    }

    // Echo back to sender
    {
        let sessions = get_sessions().lock().unwrap();
        if let Some(tx) = sessions.get(&sender_id) {
            let _ = tx.send(ws_message.to_string());
        }
    }

    Ok(())
}

// Helper function to send a message to a specific user
pub fn send_to_user(user_id: Uuid, message: String) {
    let sessions = get_sessions().lock().unwrap();
    if let Some(tx) = sessions.get(&user_id) {
        let _ = tx.send(message);
    }
}