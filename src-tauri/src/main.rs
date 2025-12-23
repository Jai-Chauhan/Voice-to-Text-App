#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use tauri::command;
use reqwest::Client;
use serde_json::Value;

#[command]
async fn transcribe_audio(audio_bytes: Vec<u8>) -> Result<String, String> {
    // Try to load .env file from multiple possible locations
    let env_loaded = dotenvy::dotenv().is_ok() || 
                     dotenvy::from_path("../.env").is_ok() ||
                     dotenvy::from_path(".env").is_ok();
    
    if !env_loaded {
        println!("Warning: .env file not found. Make sure DEEPGRAM_API_KEY is set.");
    }

    let api_key = env::var("DEEPGRAM_API_KEY")
        .map_err(|_| {
            "Missing DEEPGRAM_API_KEY environment variable. Please create a .env file in the src-tauri directory with: DEEPGRAM_API_KEY=your_key_here".to_string()
        })?;

    // Check if API key is empty or just whitespace
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err("DEEPGRAM_API_KEY is empty. Please set a valid API key in your .env file.".to_string());
    }

    println!("Received {} bytes of audio data", audio_bytes.len());
    println!("API key loaded (length: {} chars)", api_key.len());

    let client = Client::new();

    let response = client
        .post("https://api.deepgram.com/v1/listen?model=nova-2&language=en&punctuate=true")
        .header("Authorization", format!("Token {}", api_key))
        .header("Content-Type", "audio/webm;codecs=opus")
        .body(audio_bytes)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    println!("Deepgram API response status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Deepgram API error ({}): {}", status, error_text));
    }

    let json: Value = response.json().await.map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    println!("Deepgram response: {}", serde_json::to_string_pretty(&json).unwrap_or_else(|_| "Failed to serialize".to_string()));

    // Check if results exist and have content
    if let Some(results) = json.get("results") {
        if let Some(channels) = results.get("channels") {
            if let Some(channel) = channels.get(0) {
                if let Some(alternatives) = channel.get("alternatives") {
                    if let Some(alternative) = alternatives.get(0) {
                        if let Some(transcript) = alternative.get("transcript") {
                            if let Some(transcript_str) = transcript.as_str() {
                                if !transcript_str.is_empty() {
                                    return Ok(transcript_str.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Err("No transcript found in response".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![transcribe_audio])
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
