# 💬 LAN Chat 2.0

A real-time LAN chat application built with **React, Vite, Node.js, Express, MongoDB, and Socket.IO**.

---

## Prerequisites

Before running the project, make sure you have:

- Node.js (v18 or later)
- MongoDB (running locally or MongoDB Atlas)

---

## Installation

### 1. Clone the repository

```bash
cd LAN-chat2.0
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

---

## Environment Variables

Create a `.env` file in the project root and add:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/lanchat
JWT_SECRET=your_secret_key
```

If you're using MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

---

## Start the Application

Run the following command from the project root:

```bash
npm run dev
```

If everything is configured correctly, you should see:

```text
✅ MongoDB connected

LAN Chat Server Running 🚀

API:     http://localhost:5000
Client:  http://localhost:5173
```

Open the application in your browser:

```
http://localhost:5173
```

---

## Troubleshooting

### `concurrently` is not recognized

```bash
npm install
```

### `vite` is not recognized

```bash
cd client
npm install
```

### MongoDB connection failed

- Ensure MongoDB is running.
- Verify the `MONGO_URI` value in your `.env` file.

---
