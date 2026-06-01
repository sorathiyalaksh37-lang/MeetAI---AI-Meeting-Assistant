import cron from "node-cron";
import Task from "../models/Task.js";
import { sendEmail } from "../utils/sendEmail.js";

// RUN EVERY MINUTE
cron.schedule("* * * * *", async () => {
  console.log("⏰ Checking task reminders...");

  try {
    // ONLY GET TASKS THAT
    // HAVE NOT RECEIVED REMINDER
    const tasks = await Task.find({
      status: "pending",
      reminderSent: false,
    });

    for (const task of tasks) {
      // CHECK VALID EMAIL + DUE DATE
      if (
        task.assignedTo?.includes("@") &&
        task.dueDate
      ) {

        // SEND REMINDER EMAIL
        await sendEmail(
          task.assignedTo,
          "⏰ AI Meeting Task Reminder",
          `
Reminder for your assigned task.

Task: ${task.task}

Due Date: ${task.dueDate}

Please complete it before the deadline.

- AI Meeting Assistant
          `
        );

        console.log(
          `Reminder sent to ${task.assignedTo}`
        );

        // PREVENT SPAM EMAILS
        task.reminderSent = true;

        await task.save();
      }
    }
  } catch (err) {
    console.log(
      "Reminder Job Error:",
      err.message
    );
  }
});