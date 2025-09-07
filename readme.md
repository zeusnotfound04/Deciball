# ⚡🎵 DECIBALL 🎵⚡ 
*Where Music Meets Real-Time Collaboration & Beats Hit Harder!*

![DeciBall Banner](https://img.shields.io/badge/Deciball-Music%20Collaboration%20Platform-ff6b6b?style=for-the-badge&logo=music&logoColor=white)

---

## 🎵 What is DeciBall?

**DeciBall** is a revolutionary **real-time music collaboration platform** that brings people together through synchronized music experiences. Think of it as Discord meets Spotify meets collaborative playlists — but with **real-time synchronization**, **multi-platform support**, and **instant music sharing**! 🚀🎧

### ✨ **Core Philosophy**
> *"Where every beat drops together, every song syncs perfectly, and music brings people closer — one decibel at a time!"* 🎛️🎶

---

## 🌟 Key Features

### 🎵 **Real-Time Music Synchronization**
- **Perfect Sync**: Listen to music together with **millisecond-perfect synchronization**
- **Universal Playback**: Supports both **Spotify** and **YouTube** with seamless switching
- **Live Controls**: Play, pause, seek, and skip — all synchronized across all users
- **Smart Compensation**: Automatic latency compensation for perfect sync

### 🏠 **Music Spaces (Rooms)**
- **Create & Join**: Instant space creation with shareable room codes
- **Admin Controls**: Room creators have full control over playback and queue management
- **User Management**: See who's listening with real-time user presence
- **Persistent Rooms**: Spaces maintain state even with user disconnections

### 🎼 **Intelligent Queue Management**
- **Collaborative Playlists**: Everyone can add songs to the shared queue
- **Voting System**: Upvote your favorite tracks to influence play order
- **Drag & Drop**: Intuitive queue reordering (admin only)
- **Multi-Source Adding**: Add from Spotify, YouTube, or paste direct links
- **Smart Search**: Intelligent music search with metadata enrichment

### 💬 **Real-Time Chat**
- **Instant Messaging**: Chat while listening with all space members
- **Rich Presence**: See who's online and their current status
- **Message History**: Persistent chat history for ongoing conversations

### 🎨 **Dynamic Visual Experience**
- **Album Art Sync**: Room background changes with currently playing track
- **Smooth Animations**: Framer Motion powered transitions
- **Modern UI**: Tailwind CSS + Radix UI components
- **Responsive Design**: Perfect experience on all devices

### 🔧 **Advanced Music Intelligence**
- **Automatic Metadata**: Fetches rich song information (album art, artist, duration)
- **Cross-Platform Search**: Find songs across Spotify and YouTube
- **Audio Features**: Integration with Spotify's audio analysis
- **Recommendation Engine**: Smart track suggestions based on listening patterns

---

## 🛠️ Tech Stack

### **Frontend** 
| Technology | Purpose | Version |
|------------|---------|---------|
| ![Next.js](https://img.shields.io/badge/Next.js-15.0.4-000000?style=flat&logo=next.js) | Full-stack React framework with SSR | `15.0.4` |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript) | Type-safe development | `5.x` |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-06B6D4?style=flat&logo=tailwindcss) | Utility-first CSS framework | `3.4.17` |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.23.0-0055FF?style=flat&logo=framer) | Smooth animations and transitions | `12.23.0` |
| ![React Query](https://img.shields.io/badge/React_Query-5.84.2-FF4154?style=flat&logo=react-query) | Server state management | `5.84.2` |
| ![Zustand](https://img.shields.io/badge/Zustand-5.0.3-764ABC?style=flat) | Client state management | `5.0.3` |

### **Backend**
| Technology | Purpose | Version |
|------------|---------|---------|
| ![Node.js](https://img.shields.io/badge/Node.js-WebSocket_Server-339933?style=flat&logo=node.js) | WebSocket server for real-time communication | `Latest` |
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat&logo=postgresql) | Primary database for user data & spaces | `Latest` |
| ![Prisma](https://img.shields.io/badge/Prisma-6.0.1-2D3748?style=flat&logo=prisma) | Type-safe database ORM | `6.0.1` |
| ![Redis](https://img.shields.io/badge/Redis-5.5.6-DC382D?style=flat&logo=redis) | Real-time queue management & caching | `5.5.6` |
| ![BullMQ](https://img.shields.io/badge/BullMQ-5.12.14-FF6B6B?style=flat) | Background job processing | `5.12.14` |

### **Integrations**
| Service | Purpose |
|---------|---------|
| ![Spotify](https://img.shields.io/badge/Spotify_API-Music_Streaming-1DB954?style=flat&logo=spotify) | Music streaming and metadata |
| ![YouTube](https://img.shields.io/badge/YouTube_API-Video_Streaming-FF0000?style=flat&logo=youtube) | Video/music streaming |
| ![NextAuth.js](https://img.shields.io/badge/NextAuth.js-Authentication-000000?style=flat) | Authentication system |
| ![AWS S3](https://img.shields.io/badge/AWS_S3-File_Storage-FF9900?style=flat&logo=amazon-aws) | File storage |

### **DevOps & Tools**
| Technology | Purpose |
|------------|---------|
| ![Docker](https://img.shields.io/badge/Docker-Containerization-2496ED?style=flat&logo=docker) | Application containerization |
| ![Docker Compose](https://img.shields.io/badge/Docker_Compose-Multi--container-2496ED?style=flat&logo=docker) | Multi-container orchestration |

---

## 🚀 Quick Start

### 📋 **Prerequisites**
- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**
- **Spotify Developer Account** (optional, for Spotify features)

### 1️⃣ **Clone the Repository**
```bash
git clone https://github.com/zeusnotfound04/deciball.git
cd deciball
```

### 2️⃣ **Environment Setup**

#### **Next.js App Environment** (`next-app/.env`)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/deciball"
DIRECT_URL="postgresql://user:password@localhost:5432/deciball"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Spotify Integration
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-bucket-name"

# WebSocket
WS_URL="ws://localhost:8080"

# Redis
REDIS_URL="redis://localhost:6379"

# Postgres (for Docker)
POSTGRES_USER="deciball_user"
POSTGRES_PASSWORD="deciball_password"
POSTGRES_DB="deciball"
```

#### **WebSocket Server Environment** (`ws/.env`)
```env
# Database
DATABASE_URL="postgresql://deciball_user:deciball_password@localhost:5432/deciball"

# Redis
REDIS_URL="redis://localhost:6379"

# Server Config
PORT=8080
NODE_ENV="development"
```

### 3️⃣ **Docker Setup (Recommended)**
```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4️⃣ **Manual Setup (Alternative)**

#### **Start Database Services**
```bash
# Start PostgreSQL
docker run -d \
  --name deciball-postgres \
  -e POSTGRES_USER=deciball_user \
  -e POSTGRES_PASSWORD=deciball_password \
  -e POSTGRES_DB=deciball \
  -p 5432:5432 \
  postgres:latest

# Start Redis
docker run -d \
  --name deciball-redis \
  -p 6379:6379 \
  redis:latest
```

#### **Setup Next.js Application**
```bash
cd next-app

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run dev
```

#### **Setup WebSocket Server**
```bash
cd ws

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev

# Start WebSocket server
npm run dev
```

### 5️⃣ **Access the Application**
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **WebSocket Server**: [ws://localhost:8080](ws://localhost:8080)
- **Database**: `localhost:5432`
- **Redis**: `localhost:6379`

---



## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---


**DeciBall** - *Where every beat brings us together!* 🎶✨

---

![Footer](https://img.shields.io/badge/Built_with-❤️_and_🎵-ff6b6b?style=for-the-badge)
![Contributors](https://img.shields.io/github/contributors/zeusnotfound04/deciball?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/zeusnotfound04/deciball?style=for-the-badge)
![GitHub Stars](https://img.shields.io/github/stars/zeusnotfound04/deciball?style=for-the-badge)


