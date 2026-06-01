import express from "express";
import Task from "../models/Task.js";

const router = express.Router();

// =========================
// GET ALL TASKS FOR A MEETING
// =========================
router.get("/meeting/:meetingId", async (req, res) => {
  try {
    const tasks = await Task.find({ meetingId: req.params.meetingId });
    console.log(`Found ${tasks.length} tasks for meeting ${req.params.meetingId}`);
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================
// GET SINGLE TASK
// =========================
router.get("/:id", async (req, res) => {
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
// COMPLETE/UNDO TASK
// =========================
router.put("/:id/complete", async (req, res) => {
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
    
    // Toggle status
    if (task.status === "Completed") {
      task.status = "Pending";
      task.completedAt = null;
      console.log("✅ Task marked as Pending");
    } else {
      task.status = "Completed";
      task.completedAt = new Date();
      console.log("✅ Task marked as Completed");
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
router.delete("/:id", async (req, res) => {
  try {
    console.log("🗑️ Delete request for task ID:", req.params.id);
    
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      console.log("❌ Task not found for deletion:", req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: "Task not found" 
      });
    }
    
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
// GET ALL TASKS (Debug)
// =========================
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================
// DEBUG - Check tasks by meeting
// =========================
router.get("/debug/:meetingId", async (req, res) => {
  try {
    const tasks = await Task.find({ meetingId: req.params.meetingId });
    console.log(`Debug: Found ${tasks.length} tasks for meeting ${req.params.meetingId}`);
    res.json({ 
      count: tasks.length, 
      tasks: tasks,
      meetingId: req.params.meetingId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;