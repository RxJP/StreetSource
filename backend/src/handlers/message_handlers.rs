// handlers/message_handlers.rs
use actix_identity::Identity;
use actix_web::{web, HttpResponse};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::Message;
use crate::utils::get_user_id;

pub async fn get_conversations(
    identity: Identity,
    pool: web::Data<PgPool>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    let conversations = sqlx::query!(
        r#"
        SELECT DISTINCT ON (c.id)
            c.id, c.user1_id, c.user2_id, c.last_updated,
            CASE
                WHEN c.user1_id = $1 THEN u2.name
                ELSE u1.name
            END as other_user_name,
            CASE
                WHEN c.user1_id = $1 THEN u2.id
                ELSE u1.id
            END as other_user_id,
            m.content as last_message,
            m.sent_at as last_message_time
        FROM conversations c
        JOIN users u1 ON c.user1_id = u1.id
        JOIN users u2 ON c.user2_id = u2.id
        LEFT JOIN LATERAL (
            SELECT content, sent_at
            FROM messages
            WHERE conv_id = c.id
            ORDER BY sent_at DESC
            LIMIT 1
        ) m ON true
        WHERE c.user1_id = $1 OR c.user2_id = $1
        ORDER BY c.id, m.sent_at DESC NULLS LAST
        "#,
        user_id
    )
        .fetch_all(pool.get_ref())
        .await?;

    let conv_list = conversations.iter().map(|conv| {
        json!({
            "id": conv.id,
            "other_user_id": conv.other_user_id,
            "other_user_name": conv.other_user_name,
            "last_message": conv.last_message,
            "last_message_time": conv.last_message_time,
            "last_updated": conv.last_updated
        })
    }).collect::<Vec<_>>();

    Ok(HttpResponse::Ok().json(json!({
        "conversations": conv_list
    })))
}

pub async fn get_messages(
    identity: Identity,
    pool: web::Data<PgPool>,
    conv_id: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;
    let conv_id = conv_id.into_inner();

    // Verify user is part of this conversation
    let is_participant = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM conversations
            WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
        )
        "#,
        conv_id,
        user_id
    )
        .fetch_one(pool.get_ref())
        .await?.unwrap();

    if !is_participant {
        return Err(AppError::Forbidden);
    }

    // Get messages
    let messages = sqlx::query!(
        r#"
        SELECT m.id, m.sender_id, m.content, m.sent_at,
               u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conv_id = $1
        ORDER BY m.sent_at ASC
        "#,
        conv_id
    )
        .fetch_all(pool.get_ref())
        .await?;

    let message_list = messages.iter().map(|msg| {
        json!({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "content": msg.content,
            "sent_at": msg.sent_at
        })
    }).collect::<Vec<_>>();

    Ok(HttpResponse::Ok().json(json!({
        "messages": message_list
    })))
}

/// Create or get existing conversation between two users
pub async fn get_or_create_conversation(
    pool: &PgPool,
    user1_id: Uuid,
    user2_id: Uuid,
) -> AppResult<Uuid> {
    // Check if conversation already exists
    let existing_conv = sqlx::query_scalar!(
        r#"
        SELECT id FROM conversations
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        "#,
        user1_id,
        user2_id
    )
        .fetch_optional(pool)
        .await?;

    if let Some(conv_id) = existing_conv {
        return Ok(conv_id);
    }

    // Create new conversation
    let conv_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO conversations (id, user1_id, user2_id, last_updated)
        VALUES ($1, $2, $3, NOW())
        "#,
        conv_id,
        user1_id,
        user2_id
    )
        .execute(pool)
        .await?;

    Ok(conv_id)
}

/// Save a message to the database
pub async fn save_message(
    pool: &PgPool,
    conv_id: Uuid,
    sender_id: Uuid,
    content: &str,
) -> AppResult<Message> {
    let message_id = Uuid::new_v4();

    let message = sqlx::query_as!(
        Message,
        r#"
        INSERT INTO messages (id, conv_id, sender_id, content, sent_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, conv_id, sender_id, content, sent_at
        "#,
        message_id,
        conv_id,
        sender_id,
        content
    )
        .fetch_one(pool)
        .await?;

    // Update conversation last_updated timestamp
    sqlx::query!(
        "UPDATE conversations SET last_updated = NOW() WHERE id = $1",
        conv_id
    )
        .execute(pool)
        .await?;

    Ok(message)
}
