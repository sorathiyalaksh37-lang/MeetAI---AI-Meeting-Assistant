import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    task: {
      type: String,
    },

    assignedTo: {
      type: String,
    },

    dueDate: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Overdue"],
      default: "Pending",
    },

    completedAt: {
      type: Date,
    },

    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
    },
    
    // NEW: Reminder tracking
    reminderSent: {
      type: Boolean,
      default: false
    },
    
    reminderCount: {
      type: Number,
      default: 0
    },
    
    lastReminderSent: {
      type: Date
    },
    
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ meetingId: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;