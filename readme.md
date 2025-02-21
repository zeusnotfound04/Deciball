# ⚡🎵 DECIBALL 🎵⚡  
*Where Code Meets Chaos & Beats Hit Harder!*  

![DeciBall Animation](https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif)  

---

## 💥 What is DeciBall?  
**DeciBall** is not your average project — it's a **beat-driven**, **real-time**, and **electrifying** platform that merges **WebSockets**, **Redis**, **Prisma**, and **Next.js** to make the data flow like a bass drop! 🚀🎧  

> **“Turn up the decibels, and let the data dance!”** 🎛️🎶  

A place where **real-time communication** meets a **powerful UI**. Built for performance, scalability, and chaos — because who doesn't love a little bit of both? 🤯💥  

---

## ⚙️ Tech Stack  
💻 **Built with:**  

| 🛠️ **Technology**    | 💡 **Purpose**                      |
|----------------------|-------------------------------------|
| 🎗️ **Next.js**        | Fullstack React Framework for SSR  |
| 🟦 **TypeScript**     | Strong typing for a bug-free zone  |
| 🌐 **WebSockets (WS)**| Real-time communication            |
| 🛢️ **PostgreSQL + Prisma** | Database + ORM for smooth queries |
| 🔥 **Redis**          | Fast, in-memory data queues        |
| ⚡ **Docker**         | Containerized for consistency      |



---

## 🚀 Quick Start  

### 1️⃣ **Clone this banger:**  
```bash
git clone https://github.com/your-username/deciball.git
cd deciball
🎧 DeciBall Setup Guide

🚀 Getting Started

2️⃣ Install Dependencies

Run the following command to install all project dependencies:

npm install

3️⃣ Setup Environment Variables

Create a .env file in the root directory and add the following:

PORT=8080
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/deciball
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key

4️⃣ Spin Up Database (Postgres & Redis) using Docker

Start PostgreSQL and Redis containers:

docker-compose up -d

5️⃣ Run Database Migrations

Apply Prisma migrations to set up your database schema:

npx prisma migrate dev

6️⃣ Launch Development Mode (with Nodemon)

Start the development server with hot reloading:

npm run dev

7️⃣ Visit the App

🌐 Open your browser and go to:

http://localhost:3000

🎉 The party has started! 💃🕺

📊 Architecture Overview

 [ Client (Next.js) ] 🌐
          ⬇️  
  [ WebSocket Server ] 🔄 — 📡 — [ Redis Queue ]
          ⬇️  
     [ Prisma ORM ] 🧠  
          ⬇️  
   [ PostgreSQL DB ] 🗄️

🎧 Real-time beats. Scalable backend. Killer frontend. 🚀

✨ Features

✅ Real-Time Communication with WebSockets✅ Next.js Frontend for lightning-fast UIs✅ Redis Queues for efficient background tasks✅ Postgres + Prisma for structured data management✅ Hot Reloading via Nodemon for smooth development✅ Dockerized Setup for seamless deployment✅ Scalable & Modular Codebase

🧪 Testing the Beat

🔥 Test the WebSocket Server

Install wscat (if not installed):

npm install -g wscat

Connect to WebSocket:

wscat -c ws://localhost:8080

Send a message & watch the data dance:

> {"event":"ping", "data":"🎵 Hello, DeciBall!"}

🧾 Test API Routes (Next.js)

Use Postman or cURL to test API routes:

curl http://localhost:3000/api/status

🐳 Docker Setup

📦 Run Full Stack with Docker

docker-compose up --build

✅ Included Services:

PostgreSQL 🗄️

Redis 🧠

WebSocket Server 📡

Next.js Frontend 🌐

“Containers so light, they float on beats.” 🎧💨

💥 DeciBall — Where your data grooves in real time! 🎶🚀

