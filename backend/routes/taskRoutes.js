import express from "express";
import Task from "../models/Task.js";
import Meeting from "../models/Meeting.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// =========================
// GET TASKS FOR A MEETING (with auth check)
// =========================
router.get("/meeting/:meetingId", authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    
    // Verify meeting belongs to user
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    if (meeting.createdBy && meeting.createdBy.toString() !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const tasks = await Task.find({ meetingId });
    console.log(`Found ${tasks.length} tasks for meeting ${meetingId}`);
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================
// GET SINGLE TASK
// =========================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================
// COMPLETE/UNDO TASK (with notification)
// =========================
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    console.log("🔄 Complete/Undo request for task ID:", req.params.id);
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      console.log("❌ Task not found in database:", req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: "Task not found" 
      });
    }
    
    // Verify user has access to this task's meeting
    const meeting = await Meeting.findById(task.meetingId);
    if (meeting && meeting.createdBy && meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }
    
    const wasCompleted = task.status === "Completed";
    
    // Toggle status
    if (wasCompleted) {
      task.status = "Pending";
      task.completedAt = null;
      task.reminderSent = false;
      console.log("✅ Task marked as Pending");
    } else {
      task.status = "Completed";
      task.completedAt = new Date();
      task.reminderSent = true;
      console.log("✅ Task marked as Completed");
      
      // Send completion notification
      if (task.assignedTo && task.assignedTo.includes('@')) {
        await sendEmail(
          task.assignedTo,
          "✅ Task Completed - AI Meeting Assistant",
          `
Congratulations! You've completed:

📌 Task: ${task.task}
📅 Due Date: ${task.dueDate}
✅ Completed on: ${new Date().toLocaleString()}

Great work! 🎉

- AI Meeting Assistant
          `
        );
        console.log(`✅ Completion email sent to ${task.assignedTo}`);
      }
    }
    
    await task.save();
    
    res.json({ 
      success: true, 
      task: task 
    });
    
  } catch (err) {
    console.error("❌ Error in complete task:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// =========================
// DELETE TASK
// =========================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    console.log("🗑️ Delete request for task ID:", req.params.id);
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: "Task not found" 
      });
    }
    
    // Verify user has access to this task's meeting
    const meeting = await Meeting.findById(task.meetingId);
    if (meeting && meeting.createdBy && meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    
    console.log("✅ Task deleted successfully");
    res.json({ 
      success: true, 
      message: "Task deleted successfully" 
    });
    
  } catch (err) {
    console.error("❌ Error deleting task:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// =========================
// GET ALL TASKS (Debug - Only user's meetings)
// =========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userMeetings = await Meeting.find({ createdBy: userId }).select('_id');
    const meetingIds = userMeetings.map(m => m._id);
    const tasks = await Task.find({ meetingId: { $in: meetingIds } }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================
// DEBUG - Check tasks by meeting
// =========================
router.get("/debug/:meetingId", authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (meeting.createdBy && meeting.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const tasks = await Task.find({ meetingId });
    console.log(`Debug: Found ${tasks.length} tasks for meeting ${meetingId}`);
    res.json({ 
      count: tasks.length, 
      tasks: tasks,
      meetingId: meetingId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// GET TASKS BY ASSIGNED PERSON (Only user's meetings)
// =========================
router.get("/assigned/:email", authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const userId = req.user.id;
    
    const userMeetings = await Meeting.find({ createdBy: userId }).select('_id');
    const meetingIds = userMeetings.map(m => m._id);
    
    const tasks = await Task.find({ 
      meetingId: { $in: meetingIds },
      assignedTo: { $regex: new RegExp(email, 'i') }
    }).populate('meetingId', 'title');
    
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;