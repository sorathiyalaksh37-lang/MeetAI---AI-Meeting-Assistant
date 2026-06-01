import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },
    
    // NEW: User Role
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member"
    },
    
    // NEW: Google Calendar Integration
    googleTokens: {
      access_token: String,
      refresh_token: String,
      expiry_date: Date,
    },
    
    calendarConnected: {
      type: Boolean,
      default: false
    },
    
    // NEW: User preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      calendarSync: { type: Boolean, default: false },
      theme: { type: String, default: "dark" }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);