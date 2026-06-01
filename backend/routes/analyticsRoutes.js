import express from "express";
import Task from "../models/Task.js";
import Meeting from "../models/Meeting.js";

const router = express.Router();

// =========================
// GET TASK ANALYTICS FOR A MEETING
// =========================
router.get("/meeting/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const tasks = await Task.find({ meetingId });
    
    const pending = tasks.filter(t => t.status === "Pending").length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const overdue = tasks.filter(t => {
      if (t.status !== "Pending") return false;
      if (!t.dueDate || t.dueDate === "No deadline") return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < new Date();
    }).length;
    
    const dueToday = tasks.filter(t => {
      if (t.status === "Completed") return false;
      if (!t.dueDate || t.dueDate === "No deadline") return false;
      const today = new Date().toISOString().split('T')[0];
      return t.dueDate === today;
    }).length;
    
    const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
    
    // Tasks by assigned person
    const tasksByPerson = {};
    tasks.forEach(task => {
      const person = task.assignedTo || "Unassigned";
      if (!tasksByPerson[person]) {
        tasksByPerson[person] = { pending: 0, completed: 0, total: 0 };
      }
      tasksByPerson[person].total++;
      if (task.status === "Completed") {
        tasksByPerson[person].completed++;
      } else {
        tasksByPerson[person].pending++;
      }
    });
    
    res.json({
      summary: {
        total: tasks.length,
        pending,
        completed,
        overdue,
        dueToday,
        completionRate: Math.round(completionRate)
      },
      tasksByPerson,
      tasks
    });
    
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================
// GET TEAM DASHBOARD (ALL USERS)
// =========================
router.get("/team-dashboard", async (req, res) => {
  try {
    const allTasks = await Task.find().populate('meetingId', 'title');
    
    const teamStats = {};
    
    allTasks.forEach(task => {
      const person = task.assignedTo || "Unassigned";
      
      if (!teamStats[person]) {
        teamStats[person] = {
          name: person,
          pending: 0,
          completed: 0,
          overdue: 0,
          total: 0,
          meetings: new Set(),
          tasks: []
        };
      }
      
      teamStats[person].total++;
      teamStats[person].meetings.add(task.meetingId?._id || task.meetingId);
      
      if (task.status === "Completed") {
        teamStats[person].completed++;
      } else {
        teamStats[person].pending++;
        
        // Check if overdue
        if (task.dueDate && task.dueDate !== "No deadline") {
          const dueDate = new Date(task.dueDate);
          if (dueDate < new Date()) {
            teamStats[person].overdue++;
          }
        }
      }
      
      teamStats[person].tasks.push({
        id: task._id,
        task: task.task,
        status: task.status,
        dueDate: task.dueDate,
        meetingTitle: task.meetingId?.title || "Unknown Meeting"
      });
    });
    
    // Convert to array and calculate completion rate
    const teamArray = Object.values(teamStats).map(member => ({
      ...member,
      meetingsCount: member.meetings.size,
      completionRate: member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0,
      meetings: undefined
    }));
    
    // Sort by completion rate (highest first)
    teamArray.sort((a, b) => b.completionRate - a.completionRate);
    
    res.json({
      team: teamArray,
      totalTasks: allTasks.length,
      totalMembers: teamArray.length
    });
    
  } catch (err) {
    console.error("Team dashboard error:", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================
// GET USER SPECIFIC TASKS
// =========================
router.get("/user/:userName", async (req, res) => {
  try {
    const { userName } = req.params;
    
    const tasks = await Task.find({ 
      assignedTo: { $regex: new RegExp(userName, 'i') } 
    }).populate('meetingId', 'title');
    
    const pending = tasks.filter(t => t.status === "Pending");
    const completed = tasks.filter(t => t.status === "Completed");
    const overdue = pending.filter(t => {
      if (!t.dueDate || t.dueDate === "No deadline") return false;
      return new Date(t.dueDate) < new Date();
    });
    
    res.json({
      user: userName,
      summary: {
        total: tasks.length,
        pending: pending.length,
        completed: completed.length,
        overdue: overdue.length,
        completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0
      },
      tasks: tasks
    });
    
  } catch (err) {
    console.error("User tasks error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;