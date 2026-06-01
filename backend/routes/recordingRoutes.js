import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import Recording from "../models/Recording.js";
import Meeting from "../models/Meeting.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { getGridFSBucket } from "../config/gridfs.js";

const router = express.Router();

// Configure multer for memory storage (since GridFS handles the actual storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'video/mp4', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
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
      return res.status(500).json({ error: "GridFS not initialized" });
    }
    
    // Create upload stream
    const filename = `${Date.now()}-${file.originalname}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.mimetype,
      metadata: {
        meetingId: meetingId,
        uploadedBy: req.user.id,
        type: type || "audio"
      }
    });
    
    // Upload file to GridFS
    uploadStream.end(file.buffer);
    
    uploadStream.on('finish', async () => {
      // Save recording metadata to database
      const recording = await Recording.create({
        meetingId: meetingId,
        filename: filename,
        originalName: file.originalname,
        type: type || "audio",
        size: file.size,
        duration: duration || 0,
        mimeType: file.mimetype,
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
            uploadedAt: new Date()
          }
        }
      });
      
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
    });
    
    uploadStream.on('error', (error) => {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
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
      .select('-fileId'); // Exclude fileId for list view
    
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
      return res.status(500).json({ error: "GridFS not initialized" });
    }
    
    // Set response headers
    res.setHeader('Content-Type', recording.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${recording.originalName}"`);
    
    // Create download stream
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
      // Delete from GridFS
      await bucket.delete(recording.fileId);
    }
    
    // Delete from database
    await Recording.findByIdAndDelete(recordingId);
    
    // Remove from meeting
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

// =========================
// STREAM RECORDING (for playback)
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
      return res.status(500).json({ error: "GridFS not initialized" });
    }
    
    res.setHeader('Content-Type', recording.mimeType);
    
    const downloadStream = bucket.openDownloadStream(recording.fileId);
    downloadStream.pipe(res);
    
  } catch (err) {
    console.error("Stream error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;