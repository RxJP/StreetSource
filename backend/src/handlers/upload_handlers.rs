// handlers/upload_handlers.rs
use actix_identity::Identity;
use actix_multipart::Multipart;
use actix_web::HttpResponse;
use aws_config::BehaviorVersion;
use aws_sdk_s3::Client as S3Client;
use bytes::BytesMut;
use futures_util::TryStreamExt;
use nanoid::nanoid;
use serde_json::json;
use std::env;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::utils::get_user_id;

const MAX_FILE_SIZE: usize = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp"];

pub async fn upload_profile_image(
    identity: Identity,
    mut payload: Multipart,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    // Process multipart upload
    let mut file_data = BytesMut::new();
    let mut filename = String::new();

    while let Some(mut field) = payload.try_next().await.expect("Failed to read multipart field") {
        let content_disposition = field.content_disposition().expect("Missing content disposition in multipart field");

        if let Some(name) = content_disposition.get_name() {
            if name == "file" {
                if let Some(fname) = content_disposition.get_filename() {
                    filename = fname.to_string();
                }

                // Read file data
                while let Some(chunk) = field.try_next().await.expect("Failed to read file chunk from multipart field") {
                    if file_data.len() + chunk.len() > MAX_FILE_SIZE {
                        return Err(AppError::BadRequest("File size exceeds 5MB limit".to_string()));
                    }
                    file_data.extend_from_slice(&chunk);
                }
            }
        }
    }

    if file_data.is_empty() {
        return Err(AppError::BadRequest("No file uploaded".to_string()));
    }

    // Validate file extension
    let extension = filename
        .split('.')
        .last()
        .unwrap_or("")
        .to_lowercase();

    if !ALLOWED_IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err(AppError::BadRequest("Invalid file type. Only JPG, PNG, and WebP are allowed".to_string()));
    }

    // Validate it's actually an image
    if image::guess_format(&file_data).is_err() {
        return Err(AppError::BadRequest("Invalid image file".to_string()));
    }

    // Generate unique filename
    let unique_filename = format!("profile-images/{}-{}.{}", user_id, nanoid!(10), extension);

    // Upload to S3
    let s3_url = upload_to_s3(&unique_filename, file_data.freeze().to_vec(), &format!("image/{}", extension)).await.expect("Failed to upload profile image to S3");

    Ok(HttpResponse::Ok().json(json!({
        "message": "Profile image uploaded successfully",
        "image_url": s3_url
    })))
}

pub async fn upload_product_image(
    identity: Identity,
    mut payload: Multipart,
) -> AppResult<HttpResponse> {
    let user_id = get_user_id(&identity)?;

    // Process multipart upload
    let mut file_data = BytesMut::new();
    let mut filename = String::new();

    while let Some(mut field) = payload.try_next().await.expect("Failed to read multipart field") {
        let content_disposition = field.content_disposition().expect("Missing content disposition in multipart field");

        if let Some(name) = content_disposition.get_name() {
            if name == "file" {
                if let Some(fname) = content_disposition.get_filename() {
                    filename = fname.to_string();
                }

                // Read file data
                while let Some(chunk) = field.try_next().await.expect("Failed to read file chunk from multipart field") {
                    if file_data.len() + chunk.len() > MAX_FILE_SIZE {
                        return Err(AppError::BadRequest("File size exceeds 10MB limit".to_string()));
                    }
                    file_data.extend_from_slice(&chunk);
                }
            }
        }
    }

    if file_data.is_empty() {
        return Err(AppError::BadRequest("No file uploaded".to_string()));
    }

    // Validate file extension
    let extension = filename
        .split('.')
        .last()
        .unwrap_or("")
        .to_lowercase();

    if !ALLOWED_IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err(AppError::BadRequest("Invalid file type. Only JPG, PNG, and WebP are allowed".to_string()));
    }

    // Validate it's actually an image
    if image::guess_format(&file_data).is_err() {
        return Err(AppError::BadRequest("Invalid image file".to_string()));
    }

    // Generate unique filename
    let unique_filename = format!("product-images/{}-{}.{}", Uuid::new_v4(), nanoid!(10), extension);

    // Upload to S3
    let s3_url = upload_to_s3(&unique_filename, file_data.freeze().to_vec(), &format!("image/{}", extension)).await.expect("Failed to upload product image to S3");

    Ok(HttpResponse::Ok().json(json!({
        "message": "Product image uploaded successfully",
        "image_url": s3_url
    })))
}

async fn upload_to_s3(key: &str, data: Vec<u8>, content_type: &str) -> AppResult<String> {
    // Load AWS configuration
    let config = aws_config::defaults(BehaviorVersion::latest())
        .load()
        .await;

    let s3_client = S3Client::new(&config);

    // Get bucket name from environment
    let bucket_name = env::var("S3_BUCKET_NAME")
        .unwrap_or_else(|_| "streetsource-assets".to_string());

    // Upload to S3
    s3_client
        .put_object()
        .bucket(&bucket_name)
        .key(key)
        .body(data.into())
        .content_type(content_type)
        .send()
        .await
        .map_err(|e| AppError::AwsError(e.to_string()))?;

    // Return the public URL
    let region = env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());
    let s3_url = format!("https://{}.s3.{}.amazonaws.com/{}", bucket_name, region, key);

    Ok(s3_url)
}