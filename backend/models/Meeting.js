import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "New Meeting"
    },
    
    transcript: [
      {
        text: {
          type: String,
          required: true
        },
        sender: {
          type: String,
          default: "Unknown"
        },
        time: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    actionItems: [
      {
        task: String,
        assignedTo: String,
        dueDate: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Enhanced AI Summary Fields
    aiSummary: {
      type: String,
      default: ""
    },
    
    decisions: [
      {
        type: String
      }
    ],
    
    risks: [
      {
        type: String
      }
    ],
    
    // Meeting Recordings (NEW)
    recordings: [
      {
        recordingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Recording"
        },
        filename: {
          type: String
        },
        originalName: {
          type: String
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
          type: Number,
          default: 0
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      }
    ],
    
    // Meeting Statistics (NEW)
    statistics: {
      totalMessages: {
        type: Number,
        default: 0
      },
      totalActionItems: {
        type: Number,
        default: 0
      },
      completedTasks: {
        type: Number,
        default: 0
      },
      totalDuration: {
        type: Number, // in minutes
        default: 0
      },
      participants: [
        {
          name: String,
          messageCount: Number,
          lastActive: Date
        }
      ]
    },
    
    status: {
      type: String,
      enum: ["active", "ended", "archived"],
      default: "active"
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    
    // Meeting Settings (NEW)
    settings: {
      autoTranscribe: {
        type: Boolean,
        default: true
      },
      autoExtractTasks: {
        type: Boolean,
        default: true
      },
      emailReminders: {
        type: Boolean,
        default: true
      },
      calendarSync: {
        type: Boolean,
        default: false
      }
    },
    
    // Meeting Metadata (NEW)
    metadata: {
      startTime: {
        type: Date,
        default: Date.now
      },
      endTime: {
        type: Date
      },
      duration: {
        type: Number, // in seconds
        default: 0
      },
      participantCount: {
        type: Number,
        default: 1
      },
      tags: [String],
      category: {
        type: String,
        enum: ["general", "sales", "development", "marketing", "design", "other"],
        default: "general"
      }
    }
  },
  {
    timestamps: true,
  }
);

// Create text index for faster search on transcript text
meetingSchema.index({ 'transcript.text': 'text' });

// Create index for better query performance
meetingSchema.index({ createdBy: 1, createdAt: -1 });
meetingSchema.index({ status: 1, createdAt: -1 });
meetingSchema.index({ 'metadata.category': 1 });
meetingSchema.index({ 'metadata.tags': 1 });

// =========================
// VIRTUAL PROPERTIES
// =========================
meetingSchema.virtual('totalMessages').get(function() {
  return this.transcript.length;
});

meetingSchema.virtual('totalDecisions').get(function() {
  return this.decisions.length;
});

meetingSchema.virtual('totalRisks').get(function() {
  return this.risks.length;
});

meetingSchema.virtual('completionRate').get(function() {
  if (this.actionItems.length === 0) return 0;
  const completed = this.actionItems.filter(item => item.completed).length;
  return Math.round((completed / this.actionItems.length) * 100);
});

// =========================
// INSTANCE METHODS
// =========================
meetingSchema.methods.addMessage = function(sender, text) {
  this.transcript.push({
    text,
    sender,
    time: new Date()
  });
  
  // Update participant stats
  const participantIndex = this.statistics.participants.findIndex(p => p.name === sender);
  if (participantIndex === -1) {
    this.statistics.participants.push({
      name: sender,
      messageCount: 1,
      lastActive: new Date()
    });
  } else {
    this.statistics.participants[participantIndex].messageCount++;
    this.statistics.participants[participantIndex].lastActive = new Date();
  }
  
  this.statistics.totalMessages = this.transcript.length;
  return this.save();
};

meetingSchema.methods.addRecording = function(recordingId, filename, originalName, type, size, duration, userId) {
  this.recordings.push({
    recordingId,
    filename,
    originalName,
    type,
    size,
    duration,
    uploadedAt: new Date(),
    uploadedBy: userId
  });
  return this.save();
};

meetingSchema.methods.endMeeting = function() {
  this.status = "ended";
  this.metadata.endTime = new Date();
  this.metadata.duration = (this.metadata.endTime - this.metadata.startTime) / 1000;
  return this.save();
};

meetingSchema.methods.addActionItem = function(task, assignedTo, dueDate) {
  this.actionItems.push({
    task,
    assignedTo,
    dueDate,
    createdAt: new Date()
  });
  this.statistics.totalActionItems = this.actionItems.length;
  return this.save();
};

// =========================
// STATIC METHODS
// =========================
meetingSchema.statics.findActiveMeetings = function() {
  return this.find({ status: "active" }).sort({ createdAt: -1 });
};

meetingSchema.statics.findByUser = function(userId) {
  return this.find({ createdBy: userId }).sort({ createdAt: -1 });
};

meetingSchema.statics.searchTranscript = function(meetingId, searchTerm) {
  return this.findById(meetingId).where({
    'transcript.text': { $regex: searchTerm, $options: 'i' }
  });
};

// Ensure virtuals are included in JSON output
meetingSchema.set('toJSON', { virtuals: true });
meetingSchema.set('toObject', { virtuals: true });

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;