import dotenv from "dotenv";
dotenv.config(); // ✅ MUST BE FIRST

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import socketHandler from "./sockets/socketHandler.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import recordingRoutes from "./routes/recordingRoutes.js";
import { initGridFS } from "./config/gridfs.js";

import "./jobs/reminderJob.js";

import connectDB from "./config/db.js";
// ✅ NOW DB CAN ACCESS ENV
connectDB();
initGridFS();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());

// Add this for debugging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recordings", recordingRoutes);

// sockets
socketHandler(io);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});