import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true
    },
    
    filename: {
      type: String,
      required: true
    },
    
    originalName: {
      type: String,
      required: true
    },
    
    type: {
      type: String,
      enum: ["audio", "video", "transcript"],
      default: "audio"
    },
    
    size: {
      type: Number,
      default: 0
    },
    
    duration: {
      type: Number, // in seconds
      default: 0
    },
    
    mimeType: {
      type: String,
      default: "audio/webm"
    },
    
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    status: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed"],
      default: "uploading"
    },
    
    transcriptText: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Create index for faster queries
recordingSchema.index({ meetingId: 1, createdAt: -1 });

const Recording = mongoose.model("Recording", recordingSchema);
export default Recording;