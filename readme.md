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

## 📁 Project Structure

```
deciball/
├── 📂 next-app/                 # Frontend Next.js application
│   ├── 📂 app/                  # App router pages and layouts
│   │   ├── 📂 api/             # API routes
│   │   ├── 📂 components/      # React components
│   │   ├── 📂 dashboard/       # Dashboard pages
│   │   ├── 📂 space/          # Music space pages
│   │   └── 📂 profile/        # User profile pages
│   ├── 📂 components/          # Shared UI components
│   │   ├── 📂 ui/             # Base UI components
│   │   ├── Player.tsx         # Main music player
│   │   ├── QueueManager.tsx   # Queue management
│   │   └── MusicRoom.tsx      # Music room component
│   ├── 📂 store/              # Zustand state management
│   │   ├── audioStore.tsx     # Audio playback state
│   │   └── userStore.ts       # User state
│   ├── 📂 actions/            # Server actions
│   │   ├── 📂 spotify/        # Spotify API calls
│   │   └── 📂 users/          # User management
│   ├── 📂 lib/                # Utility libraries
│   ├── 📂 hooks/              # Custom React hooks
│   ├── 📂 prisma/             # Database schema and migrations
│   └── 📂 public/             # Static assets
├── 📂 ws/                      # WebSocket server
│   ├── 📂 src/
│   │   ├── 📂 handlers/       # WebSocket message handlers
│   │   ├── 📂 managers/       # Business logic managers
│   │   │   └── streamManager.ts # Core room/stream management
│   │   ├── 📂 workers/        # Background workers
│   │   │   └── musicWorker.ts # Music processing worker
│   │   ├── 📂 cache/          # Redis cache management
│   │   └── app.ts             # Main server entry point
│   ├── 📂 scripts/            # Utility scripts
│   └── 📂 prisma/             # Database schema (shared)
└── 📄 docker-compose.yml      # Multi-container orchestration
```

---

## 🎮 How to Use

### 🏠 **Creating a Music Space**
1. **Sign In**: Login with Google OAuth
2. **Create Space**: Click "Create New Space" and give it a name
3. **Share**: Share the space ID with friends
4. **Start Listening**: Add songs and start the party!

### 🎵 **Adding Music**
- **Search**: Use the search bar to find songs on Spotify/YouTube
- **Direct Links**: Paste Spotify/YouTube URLs directly
- **Drag & Drop**: Drop YouTube links onto the player
- **Playlists**: Import entire Spotify playlists

### 🎛️ **Playback Controls**
- **Play/Pause**: Synchronized across all users
- **Seek**: Jump to any part of the song
- **Next/Previous**: Navigate through the queue
- **Volume**: Individual volume control per user

### 👑 **Admin Features** (Space Creator)
- **Queue Management**: Reorder, remove songs
- **User Control**: Manage space members
- **Playback Control**: Master control over playback
- **Space Settings**: Modify space configuration

---

## 🔧 Advanced Features

### 🎯 **Real-Time Synchronization**
- **WebSocket Architecture**: Persistent connection for instant updates
- **Timestamp Sync**: Millisecond-accurate playback synchronization
- **Latency Compensation**: Automatic adjustment for network delays
- **State Recovery**: Resume from exact position after disconnection

### 🧠 **Smart Music Processing**
- **Multi-Worker System**: Parallel processing for music search
- **Metadata Enrichment**: Automatic album art and track info
- **Cross-Platform Mapping**: Spotify tracks → YouTube playback
- **Quality Optimization**: Best available audio/video quality

### 💾 **Caching & Performance**
- **Redis Caching**: Queue and playback state caching
- **Background Jobs**: Asynchronous music processing with BullMQ
- **Connection Pooling**: Efficient database connections
- **CDN Integration**: Fast asset delivery

### 🔐 **Security & Authentication**
- **JWT Tokens**: Secure WebSocket authentication
- **OAuth Integration**: Google and Spotify login
- **Rate Limiting**: Protection against abuse
- **Data Validation**: Input sanitization and validation

---

## 🔌 API Integration

### 🎵 **Spotify Web API**
```javascript
// Example: Get track audio features
const audioFeatures = await getAudioFeatures(trackId);
const recommendations = await getRecommendations({
  seed_tracks: [trackId],
  target_energy: audioFeatures.energy,
  target_danceability: audioFeatures.danceability
});
```

### 📺 **YouTube API**
```javascript
// Example: Search and extract video ID
const youtubeResult = await searchYouTube(query);
const videoId = extractYouTubeVideoId(youtubeResult.url);
```

### 🔗 **WebSocket Events**
```javascript
// Join a music space
socket.send(JSON.stringify({
  type: 'join-room',
  data: { spaceId, token, spaceName }
}));

// Add song to queue
socket.send(JSON.stringify({
  type: 'add-song',
  data: { spaceId, songData, userId }
}));

// Playback control
socket.send(JSON.stringify({
  type: 'playback-play',
  data: { spaceId, userId, timestamp }
}));
```

---

## 🐳 Docker Configuration

### **Production Deployment**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: ./next-app
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - ws-server

  ws-server:
    build: ./ws
    environment:
      - NODE_ENV=production
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 🛠️ Development Scripts

### **Next.js App** (`next-app/`)
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:https": "next dev --experimental-https -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "flush-spaces": "tsx scripts/flush-spaces.ts"
  }
}
```

### **WebSocket Server** (`ws/`)
```json
{
  "scripts": {
    "dev": "nodemon",
    "start": "node dist/app.js",
    "build": "tsc -b",
    "prisma:migrate": "prisma migrate dev",
    "flush-cache": "npx ts-node scripts/flush-cache.ts",
    "cache-manager": "npx ts-node scripts/cache-manager.ts"
  }
}
```

---

## 🧪 Testing

### **Run Tests**
```bash
# Frontend tests
cd next-app
npm run test

# Backend tests
cd ws
npm run test

# E2E tests
npm run test:e2e
```

### **Manual Testing Checklist**
- [ ] User authentication (Google OAuth)
- [ ] Space creation and joining
- [ ] Music search (Spotify/YouTube)
- [ ] Real-time synchronization
- [ ] Queue management
- [ ] Chat functionality
- [ ] Mobile responsiveness

---

## 🔄 Database Schema

### **Key Models**
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String?  @unique
  pfpUrl       String?
  hostedSpaces Space[]  @relation("hostedBy")
  addedStreams Stream[] @relation("addedBy")
  upvotes      Upvote[]
}

model Space {
  id            String         @id @default(uuid())
  name          String
  hostId        String
  isActive      Boolean        @default(true)
  currentStream CurrentStream?
  streams       Stream[]       @relation("spaceStreams")
  host          User           @relation("hostedBy", fields: [hostId], references: [id])
}

model Stream {
  id          String     @id @default(uuid())
  type        StreamType
  title       String
  artist      String?
  duration    Int?
  smallImg    String?
  bigImg      String?
  url         String
  extractedId String
  upvotes     Upvote[]
  spaceId     String?
  space       Space?     @relation("spaceStreams", fields: [spaceId], references: [id])
}
```

---

## 🚀 Deployment

### **Vercel (Frontend)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd next-app
vercel --prod
```

### **Railway/Render (Backend)**
```bash
# Deploy WebSocket server
cd ws
# Configure build command: npm run build
# Configure start command: npm start
```

### **Environment Variables**
Make sure to set all required environment variables in your deployment platform:
- Database URLs
- OAuth credentials
- API keys
- Redis connection strings

---

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow the configured rules
- **Prettier**: Code formatting
- **Conventional Commits**: Use semantic commit messages

### **Areas for Contribution**
- 🎵 Music platform integrations (Apple Music, Deezer)
- 🎨 UI/UX improvements
- 🔧 Performance optimizations
- 🧪 Test coverage
- 📖 Documentation
- 🌐 Internationalization

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js Team** - For the amazing full-stack framework
- **Prisma Team** - For the excellent database toolkit
- **Spotify** - For the comprehensive Web API
- **Redis Labs** - For the blazing-fast in-memory database
- **Vercel** - For the seamless deployment platform

---

## 📞 Support & Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/zeusnotfound04/deciball/issues)
- **Discussions**: [Community discussions](https://github.com/zeusnotfound04/deciball/discussions)
- **Email**: [Insert your email]
- **Twitter**: [Insert your Twitter handle]

---

## 🎵 Made with ❤️ and lots of ☕

**DeciBall** - *Where every beat brings us together!* 🎶✨

---

![Footer](https://img.shields.io/badge/Built_with-❤️_and_🎵-ff6b6b?style=for-the-badge)
![Contributors](https://img.shields.io/github/contributors/zeusnotfound04/deciball?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/zeusnotfound04/deciball?style=for-the-badge)
![GitHub Stars](https://img.shields.io/github/stars/zeusnotfound04/deciball?style=for-the-badge)
