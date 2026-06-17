// server/routes/recordingRoutes.js
import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import Recording from "../models/Recording.js";
import Meeting from "../models/Meeting.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { getGridFSBucket } from "../config/gridfs.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// =========================
// UPLOAD RECORDING
// =========================
router.post("/upload/:meetingId", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { type, duration } = req.body;
    const file = req.file;
    
    console.log("Upload request:", { meetingId, type, duration, fileSize: file?.size });
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    
    // Get GridFS bucket
    const bucket = getGridFSBucket();
    if (!bucket) {
      console.error("GridFS not initialized");
      return res.status(500).json({ error: "Storage not initialized" });
    }
    
    // Create upload stream
    const filename = `${Date.now()}-${file.originalname}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.mimetype || 'audio/webm',
      metadata: {
        meetingId: meetingId,
        uploadedBy: req.user.id,
        type: type || "audio"
      }
    });
    
    // Upload file to GridFS
    uploadStream.end(file.buffer);
    
    uploadStream.on('finish', async () => {
      try {
        // Save recording metadata to database
        const recording = await Recording.create({
          meetingId: meetingId,
          filename: filename,
          originalName: file.originalname,
          type: type || "audio",
          size: file.size,
          duration: duration || 0,
          mimeType: file.mimetype || 'audio/webm',
          fileId: uploadStream.id,
          uploadedBy: req.user.id,
          status: "completed"
        });
        
        // Update meeting with recording reference
        await Meeting.findByIdAndUpdate(meetingId, {
          $push: {
            recordings: {
              recordingId: recording._id,
              filename: filename,
              originalName: file.originalname,
              type: type || "audio",
              size: file.size,
              duration: duration || 0,
              uploadedAt: new Date(),
              uploadedBy: req.user.id
            }
          }
        });
        
        console.log("Recording saved:", recording._id);
        
        res.json({
          success: true,
          recording: {
            id: recording._id,
            filename: recording.filename,
            size: recording.size,
            type: recording.type,
            createdAt: recording.createdAt
          }
        });
      } catch (err) {
        console.error("Save metadata error:", err);
        res.status(500).json({ error: "Failed to save recording metadata" });
      }
    });
    
    uploadStream.on('error', (error) => {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed: " + error.message });
    });
    
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// GET ALL RECORDINGS FOR A MEETING
// =========================
router.get("/meeting/:meetingId", authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const recordings = await Recording.find({ meetingId })
      .sort({ createdAt: -1 })
      .select('-fileId');
    
    res.json({
      success: true,
      count: recordings.length,
      recordings: recordings
    });
    
  } catch (err) {
    console.error("Get recordings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// DOWNLOAD RECORDING
// =========================
router.get("/download/:recordingId", authMiddleware, async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: "Recording not found" });
    }
    
    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(500).json({ error: "Storage not initialized" });
    }
    
    res.setHeader('Content-Type', recording.mimeType || 'audio/webm');
    res.setHeader('Content-Disposition', `attachment; filename="${recording.originalName || 'recording.webm'}"`);
    
    const downloadStream = bucket.openDownloadStream(recording.fileId);
    
    downloadStream.on('error', (error) => {
      console.error("Download error:", error);
      res.status(500).json({ error: "Download failed" });
    });
    
    downloadStream.pipe(res);
    
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// STREAM RECORDING
// =========================
router.get("/stream/:recordingId", authMiddleware, async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: "Recording not found" });
    }
    
    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(500).json({ error: "Storage not initialized" });
    }
    
    res.setHeader('Content-Type', recording.mimeType || 'audio/webm');
    
    const downloadStream = bucket.openDownloadStream(recording.fileId);
    downloadStream.pipe(res);
    
  } catch (err) {
    console.error("Stream error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// DELETE RECORDING
// =========================
router.delete("/:recordingId", authMiddleware, async (req, res) => {
  try {
    const { recordingId } = req.params;
    
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: "Recording not found" });
    }
    
    const bucket = getGridFSBucket();
    if (bucket) {
      await bucket.delete(recording.fileId);
    }
    
    await Recording.findByIdAndDelete(recordingId);
    
    await Meeting.findByIdAndUpdate(recording.meetingId, {
      $pull: {
        recordings: { recordingId: recordingId }
      }
    });
    
    res.json({
      success: true,
      message: "Recording deleted successfully"
    });
    
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;