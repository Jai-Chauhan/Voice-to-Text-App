# 📣 Voice-to-Text Desktop App

A **cross-platform desktop voice-to-text application** built with **Tauri**, **React**, and the **Deepgram API**.  
It allows users to press and hold a keyboard key (SPACE) to speak, and see **live transcription** of their voice — similar to Wispr Flow.

🎧 Users can:
- Hold SPACE to start speaking
- See live partial transcription
- Release SPACE to finalize the text
- Copy text to clipboard
- Clear transcribed text

This project demonstrates a secure, clean modern stack for real-time voice transcription.

---

## 🚀 Features

✨ **Push-to-Talk Voice Input** — Hold SPACE to speak  
📍 **Live Partial Transcription** while recording  
💬 **Final Transcription Appending**  
📋 **Copy / Clear Text Controls**  
🔒 **Secure Backend for Deepgram API**  
📦 Built with Tauri for lightweight native desktop packages

---

## 🧠 Technology Stack

| Component | Technology |
|-----------|------------|
| Desktop framework | **Tauri** |
| UI | **React + Vite** |
| Transcription API | **Deepgram Speech-to-Text** |
| Backend language | **Rust (Tauri backend)** |
| Audio capture | Web Audio API |
| Packaging | Tauri builds native binaries |

> Deepgram’s Speech-to-Text API powers the transcription — a powerful and low-latency speech recognition service. :contentReference[oaicite:0]{index=0}

---

## 📁 Repository Structure

```text
voice-to-text-app/
├── src/                   # React frontend
├── src-tauri/             # Tauri & Rust backend
├── package.json
├── tauri.conf.json
└── README.md
```

## ⚙️ Prerequisites

Ensure the following software is installed on your system before running the project.

### Node.js
- Download from: https://nodejs.org
- Recommended version: **16 or higher**

Verify installation:
node -v
npm -v


---

### Rust & Cargo (Required for Tauri)

Install Rust using the official installer:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh


Restart your terminal after installation and verify:
rustc --version
cargo --version


---

### Tauri CLI

Install the Tauri CLI globally:
npm install -g @tauri-apps/cli


Verify installation:
tauri --version



---

## ▶️ Running the Project (ZIP Download Method)

### Step 1: Open the Extracted Project Folder

1. Download the ZIP file from GitHub  
2. Extract the ZIP file  
3. Open the extracted `Voice-to-Text-App` folder  
4. Open Terminal / Command Prompt / PowerShell inside this folder  

---

### Step 2: Install Dependencies

Run the following command inside the project folder:
npm install


---

### Step 3: Start the Desktop Application

Run:
npm run tauri dev


This will build the frontend and launch the Tauri desktop application with hot reload enabled.


