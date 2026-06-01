import Task from "../models/Task.js";

// GET TASKS BY MEETING
export const getTasksByMeeting = async (req, res) => {
  try {
    const tasks = await Task.find({
      meetingId: req.params.id,
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE TASK STATUS
export const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};