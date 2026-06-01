import express from "express";
import User from "../models/User.js";
import Meeting from "../models/Meeting.js";
import Task from "../models/Task.js";
import authMiddleware, { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================
// GET ALL USERS (ADMIN ONLY)
// =========================
router.get("/users", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    console.log("Fetched users:", users.length);
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// UPDATE USER ROLE (ADMIN ONLY - Allow self update)
// =========================
router.put("/users/:userId/role", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    console.log("Updating user role - UserId:", userId, "New Role:", role);
    console.log("Requesting user ID:", req.user.id);
    
    // Validate role
    if (!["admin", "member", "viewer"].includes(role)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid role. Must be admin, member, or viewer" 
      });
    }
    
    // Allow self update - remove the restriction
    // This lets admin change their own role if needed
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role: role },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }
    
    console.log("User role updated successfully:", user.email, "to", user.role);
    
    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: user
    });
    
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// =========================
// GET DASHBOARD STATS (ADMIN ONLY)
// =========================
router.get("/stats", authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMeetings = await Meeting.countDocuments();
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    
    const adminCount = await User.countDocuments({ role: "admin" });
    const memberCount = await User.countDocuments({ role: "member" });
    const viewerCount = await User.countDocuments({ role: "viewer" });
    
    res.json({
      success: true,
      totalUsers,
      totalMeetings,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      roleBreakdown: {
        admin: adminCount,
        member: memberCount,
        viewer: viewerCount
      }
    });
    
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// GET CURRENT USER ROLE
// =========================
router.get("/me/role", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("role name email");
    console.log("User role fetched:", user.email, "Role:", user.role);
    res.json(user);
  } catch (err) {
    console.error("Get role error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// DELETE USER (ADMIN ONLY)
// =========================
router.delete("/users/:userId", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Don't allow deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log("User deleted:", user.email);
    res.json({ success: true, message: "User deleted successfully" });
    
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;