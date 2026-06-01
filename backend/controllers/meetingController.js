import Meeting from "../models/Meeting.js";

// CREATE MEETING
export const createMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.create({
      title: req.body.title || "New Meeting",
    });

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL MEETINGS
export const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find().sort({ createdAt: -1 });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE MEETING
export const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// END MEETING
export const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status: "ended" },
      { new: true }
    );

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};