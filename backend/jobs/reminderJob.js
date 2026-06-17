import cron from "node-cron";
import Task from "../models/Task.js";
import Meeting from "../models/Meeting.js";
import { sendEmail } from "../utils/sendEmail.js";

// RUN EVERY MINUTE
cron.schedule("* * * * *", async () => {
  console.log("⏰ Checking task reminders...");

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // Format dates for comparison
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterStr = dayAfterTomorrow.toISOString().split('T')[0];

    // Get pending tasks with due dates
    const tasks = await Task.find({
      status: "Pending",
      dueDate: { $ne: "No deadline" },
      reminderSent: false
    }).populate('meetingId', 'title');

    console.log(`Found ${tasks.length} tasks to check for reminders`);

    for (const task of tasks) {
      let reminderType = null;
      let daysUntil = 0;

      // Check if task has a valid due date
      if (!task.dueDate || task.dueDate === "No deadline") continue;

      try {
        const dueDate = new Date(task.dueDate);
        if (isNaN(dueDate.getTime())) continue;

        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        // Calculate days until due
        const diffTime = dueDate.getTime() - now.getTime();
        daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Determine reminder type
        if (daysUntil === 1) {
          reminderType = "tomorrow";
        } else if (daysUntil === 2) {
          reminderType = "day_after";
        } else if (daysUntil <= 0) {
          reminderType = "overdue";
        }

        if (!reminderType) continue;

        console.log(`Task "${task.task}" is due in ${daysUntil} days (${reminderType})`);

        // Send email if assigned user has email
        if (task.assignedTo && task.assignedTo.includes('@')) {
          await sendTaskReminder(task, reminderType, daysUntil);
          task.reminderSent = true;
          await task.save();
          console.log(`✅ Reminder sent to ${task.assignedTo} for task: ${task.task}`);
        }

      } catch (err) {
        console.error(`Error processing task ${task._id}:`, err.message);
      }
    }

    // Also send weekly summary on Fridays
    const dayOfWeek = now.getDay(); // 5 = Friday
    if (dayOfWeek === 5 && now.getHours() === 9) { // Friday at 9 AM
      await sendWeeklySummary();
    }

  } catch (err) {
    console.error("Reminder Job Error:", err.message);
  }
});

// =========================
// SEND TASK REMINDER
// =========================
const sendTaskReminder = async (task, reminderType, daysUntil) => {
  let subject, message;

  const meetingTitle = task.meetingId?.title || "Unknown Meeting";

  if (reminderType === "overdue") {
    subject = "⚠️ OVERDUE: Task from AI Meeting Assistant";
    message = `
🚨 OVERDUE TASK ALERT 🚨

Task: ${task.task}
📅 Due Date: ${task.dueDate}
📊 Status: ${task.status}
📄 Meeting: ${meetingTitle}

THIS TASK IS OVERDUE! Please complete it immediately.

If you've already completed this task, please mark it as complete in the dashboard.

🔗 View Task: http://localhost:5173/meeting/${task.meetingId}

- AI Meeting Assistant
    `;
  } else if (reminderType === "tomorrow") {
    subject = "⏰ REMINDER: Task Due Tomorrow!";
    message = `
⏰ TASK REMINDER - DUE TOMORROW

Task: ${task.task}
📅 Due Date: ${task.dueDate}
📊 Status: ${task.status}
📄 Meeting: ${meetingTitle}

Please complete this task by tomorrow.

🔗 View Task: http://localhost:5173/meeting/${task.meetingId}

- AI Meeting Assistant
    `;
  } else if (reminderType === "day_after") {
    subject = "📋 REMINDER: Task Due in 2 Days";
    message = `
📋 TASK REMINDER

Task: ${task.task}
📅 Due Date: ${task.dueDate}
📊 Status: ${task.status}
📄 Meeting: ${meetingTitle}

You have 2 days to complete this task.

🔗 View Task: http://localhost:5173/meeting/${task.meetingId}

- AI Meeting Assistant
    `;
  }

  await sendEmail(task.assignedTo, subject, message);
};

// =========================
// SEND WEEKLY SUMMARY
// =========================
const sendWeeklySummary = async () => {
  try {
    const tasks = await Task.find({
      status: "Pending",
      dueDate: { $ne: "No deadline" }
    }).populate('meetingId', 'title');

    if (tasks.length === 0) return;

    // Group by assigned person
    const tasksByPerson = {};
    for (const task of tasks) {
      const person = task.assignedTo || "Unassigned";
      if (!tasksByPerson[person]) {
        tasksByPerson[person] = [];
      }
      tasksByPerson[person].push(task);
    }

    // Send summary email to each person
    for (const [person, taskList] of Object.entries(tasksByPerson)) {
      if (!person.includes('@')) continue;

      let message = `
📊 WEEKLY TASK SUMMARY

Hello! Here's your pending tasks for the week:

`;

      for (const task of taskList) {
        message += `
📌 Task: ${task.task}
   📅 Due: ${task.dueDate}
   📄 Meeting: ${task.meetingId?.title || "Unknown"}
`;
      }

      message += `

Total Pending Tasks: ${taskList.length}

Please complete these tasks before their deadlines.

🔗 View Dashboard: http://localhost:5173/

- AI Meeting Assistant
      `;

      await sendEmail(person, "📊 Weekly Task Summary - AI Meeting Assistant", message);
      console.log(`✅ Weekly summary sent to ${person}`);
    }

  } catch (err) {
    console.error("Weekly summary error:", err.message);
  }
};

export default cron;