# 🧠 MeetAI - AI Meeting Assistant

![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Node](https://img.shields.io/badge/Node-18.x-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47A248)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101)
![Tailwind](https://img.shields.io/badge/Tailwind-3.x-06B6D4)
![License](https://img.shields.io/badge/License-MIT-yellow)

![Demo](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node](https://img.shields.io/badge/Node-18.x-green)

> **Real-time meeting assistant that automatically transcribes conversations, extracts action items using AI, and manages tasks across teams.**

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 **Speech-to-Text** | Voice input with browser's native Web Speech API |
| 🤖 **AI Task Extraction** | Automatic detection of tasks, assignees, and due dates using Groq Llama 3.1 |
| 📝 **Meeting Summary** | AI-generated summary, decisions, and risks extraction |
| 🎙️ **Meeting Recording** | Record audio with real-time transcription |
| 🔍 **Search** | Search across all meeting transcripts with highlighting |
| 📊 **Analytics** | Task analytics with charts (Chart.js) |
| 👥 **Team Dashboard** | Track team member performance |
| 📅 **Calendar Sync** | One-click add tasks to Google Calendar |
| 📧 **Email Reminders** | Automatic email notifications for assigned tasks |
| 👑 **User Roles** | Admin, Member, Viewer with permissions |

## 🏗️ Tech Stack

### Frontend
- **React 18** + Vite
- **Tailwind CSS** - Styling
- **Socket.io-client** - Real-time updates
- **Chart.js** - Analytics charts
- **Axios** - API calls

### Backend
- **Node.js** + Express
- **Socket.io** - Real-time communication
- **MongoDB** + Mongoose
- **GridFS** - Audio recording storage
- **JWT** - Authentication
- **Groq AI** - Llama 3.1 (Free tier)
- **Nodemailer** - Email notifications
- **node-cron** - Scheduled reminders

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Groq API key (free at console.groq.com)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/meet-ai-assistant.git
cd meet-ai-assistant

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Create .env files (see .env.example)
# Backend (.env)
# Frontend (.env.local if needed)