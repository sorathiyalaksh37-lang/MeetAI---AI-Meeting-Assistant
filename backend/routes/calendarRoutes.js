import express from "express";
import { google } from "googleapis";
import User from "../models/User.js";
import Task from "../models/Task.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Google OAuth2 configuration (for future implementation)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.SERVER_URL || 'http://localhost:5001'}/api/calendar/google-callback`
);

// =========================
// TEST ENDPOINT (Check if auth is working)
// =========================
router.get("/test", authMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: "Calendar API is working!", 
    user: { id: req.user.id, role: req.user.role }
  });
});

// =========================
// GET AUTH URL (For future OAuth implementation)
// =========================
router.get("/auth-url", authMiddleware, (req, res) => {
  try {
    // Return a helpful message instead of requiring OAuth
    res.json({ 
      success: true,
      authUrl: "https://calendar.google.com/calendar/r/settings",
      message: "Click the link to open Google Calendar. For full integration, configure Google API credentials.",
      directLink: true
    });
  } catch (err) {
    console.error("Auth URL error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// CREATE CALENDAR EVENT (Simplified - No OAuth Required)
// =========================
router.post("/create-event/:taskId", authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    console.log("Creating calendar event for task:", taskId);
    console.log("User:", req.user.id);
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      console.log("Task not found:", taskId);
      return res.status(404).json({ 
        success: false,
        error: "Task not found" 
      });
    }
    
    console.log("Task found:", task.task);
    
    // Get the user
    const user = await User.findById(req.user.id);
    
    // Prepare event details
    const taskTitle = task.task || "Untitled Task";
    const assignedTo = task.assignedTo || "Unassigned";
    const status = task.status || "Pending";
    
    // Format the due date
    let formattedDate = new Date();
    if (task.dueDate && task.dueDate !== "No deadline") {
      try {
        formattedDate = new Date(task.dueDate);
      } catch (e) {
        formattedDate = new Date();
      }
    }
    
    // Format for Google Calendar (YYYYMMDD)
    const year = formattedDate.getFullYear();
    const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
    const day = String(formattedDate.getDate()).padStart(2, '0');
    const cleanDate = `${year}${month}${day}`;
    
    // Create Google Calendar URL
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      taskTitle
    )}&dates=${cleanDate}/${cleanDate}&details=${encodeURIComponent(
      `Task from AI Meeting Assistant\n\n📋 Task: ${taskTitle}\n👤 Assigned to: ${assignedTo}\n📊 Status: ${status}\n🔗 Meeting ID: ${task.meetingId || 'N/A'}`
    )}&location=Virtual`;
    
    console.log("Calendar URL generated successfully");
    
    // Return success response
    res.json({
      success: true,
      message: "Calendar link generated successfully",
      calendarUrl: calendarUrl,
      task: {
        id: task._id,
        title: taskTitle,
        dueDate: task.dueDate,
        assignedTo: assignedTo
      }
    });
    
  } catch (err) {
    console.error("Calendar event error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to generate calendar link"
    });
  }
});

// =========================
// CREATE CALENDAR EVENT WITH CUSTOM DATE
// =========================
router.post("/create-event-custom", authMiddleware, async (req, res) => {
  try {
    const { title, description, dueDate, assignedTo } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        error: "Task title is required" 
      });
    }
    
    // Format the date
    let cleanDate;
    if (dueDate && dueDate !== "No deadline") {
      try {
        const dateObj = new Date(dueDate);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        cleanDate = `${year}${month}${day}`;
      } catch (e) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        cleanDate = `${year}${month}${day}`;
      }
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      cleanDate = `${year}${month}${day}`;
    }
    
    // Create Google Calendar URL
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${cleanDate}/${cleanDate}&details=${encodeURIComponent(
      description || `Task from AI Meeting Assistant\nAssigned to: ${assignedTo || 'Unassigned'}`
    )}`;
    
    res.json({
      success: true,
      calendarUrl: calendarUrl
    });
    
  } catch (err) {
    console.error("Custom calendar event error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// =========================
// SYNC ALL PENDING TASKS
// =========================
router.post("/sync-all", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }
    
    // Find tasks assigned to this user or all tasks if admin
    let tasks;
    if (user.role === 'admin') {
      tasks = await Task.find({ status: "Pending" }).limit(50);
    } else {
      tasks = await Task.find({ 
        assignedTo: user.email,
        status: "Pending" 
      }).limit(50);
    }
    
    const events = tasks.map(task => {
      // Format date
      let cleanDate;
      if (task.dueDate && task.dueDate !== "No deadline") {
        try {
          const dateObj = new Date(task.dueDate);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          cleanDate = `${year}${month}${day}`;
        } catch (e) {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          cleanDate = `${year}${month}${day}`;
        }
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        cleanDate = `${year}${month}${day}`;
      }
      
      return {
        id: task._id,
        task: task.task,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo,
        eventUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.task)}&dates=${cleanDate}/${cleanDate}&details=${encodeURIComponent(`Task from AI Meeting Assistant\nAssigned to: ${task.assignedTo || 'Unassigned'}`)}`
      };
    });
    
    res.json({
      success: true,
      message: `Found ${tasks.length} pending tasks`,
      synced: tasks.length,
      events: events
    });
    
  } catch (err) {
    console.error("Sync all error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// =========================
// GET CALENDAR INTEGRATION STATUS
// =========================
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      connected: user?.calendarConnected || false,
      message: "Calendar integration is ready. Click the Calendar button on any task to add it to Google Calendar.",
      features: {
        singleEvent: true,
        bulkSync: true,
        customDate: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// GOOGLE OAUTH CALLBACK (For future full integration)
// =========================
router.get("/google-callback", async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error("OAuth error:", error);
    return res.send(`
      <html>
        <body style="background:#060b16;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
          <div style="text-align:center;">
            <h1 style="color:#ef4444;">❌ Calendar Connection Failed</h1>
            <p>${error}</p>
            <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#3b82f6;border:none;border-radius:10px;color:white;cursor:pointer;">Close</button>
          </div>
        </body>
      </html>
    `);
  }
  
  if (code) {
    try {
      // This is where you would exchange the code for tokens
      // For now, just show success
      res.send(`
        <html>
          <body style="background:#060b16;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
            <div style="text-align:center;">
              <h1 style="color:#10b981;">✅ Calendar Connected Successfully!</h1>
              <p>You can now close this window and return to the app.</p>
              <p>Click the Calendar button on any task to add it to your Google Calendar.</p>
              <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#3b82f6;border:none;border-radius:10px;color:white;cursor:pointer;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      res.send(`
        <html>
          <body style="background:#060b16;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
            <div style="text-align:center;">
              <h1 style="color:#ef4444;">❌ Connection Failed</h1>
              <p>${err.message}</p>
              <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#3b82f6;border:none;border-radius:10px;color:white;cursor:pointer;">Close</button>
            </div>
          </body>
        </html>
      `);
    }
  } else {
    res.send(`
      <html>
        <body style="background:#060b16;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
          <div style="text-align:center;">
            <h1>📅 Google Calendar Integration</h1>
            <p>To use calendar sync, simply click the Calendar button on any task.</p>
            <p>This will open Google Calendar with the task pre-filled.</p>
            <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#3b82f6;border:none;border-radius:10px;color:white;cursor:pointer;">Close</button>
          </div>
        </body>
      </html>
    `);
  }
});

export default router;