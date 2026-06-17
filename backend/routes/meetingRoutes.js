import express from "express";
import Meeting from "../models/Meeting.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================
// CREATE MEETING (with user association)
// =========================
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.create({
      title: req.body.title || "New Meeting",
      createdBy: req.user.id, // Associate meeting with user
    });

    console.log("Meeting created:", meeting._id, "by user:", req.user.id);
    res.json(meeting);

  } catch (err) {
    console.error("Create meeting error:", err);
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// GET ALL MEETINGS (only user's meetings)
// =========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Only get meetings created by this user
    const meetings = await Meeting.find({ 
      createdBy: req.user.id 
    }).sort({ createdAt: -1 });

    console.log("Fetched", meetings.length, "meetings for user:", req.user.id);
    res.json(meetings);

  } catch (err) {
    console.error("Get meetings error:", err);
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// GET SINGLE MEETING (check user ownership)
// =========================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    // Check if user owns this meeting
    if (meeting.createdBy && meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Access denied. You don't own this meeting.",
      });
    }

    res.json(meeting);

  } catch (err) {
    console.error("Get meeting error:", err);
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// END MEETING
// =========================
router.put("/:id/end", authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Check ownership
    if (meeting.createdBy && meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    meeting.status = "ended";
    await meeting.save();

    res.json(meeting);

  } catch (err) {
    console.error("End meeting error:", err);
    res.status(500).json({
      message: err.message,
    });
  }
});

export default router;