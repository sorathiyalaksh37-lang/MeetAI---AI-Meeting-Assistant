import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();


// CREATE MEETING
router.post("/create", async (req, res) => {
  try {
    const meeting = await Meeting.create({
      title: req.body.title,
    });

    res.json(meeting);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});


// GET ALL MEETINGS
router.get("/", async (req, res) => {
  try {
    const meetings = await Meeting.find();

    res.json(meetings);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// GET SINGLE MEETING
router.get("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(
      req.params.id
    );

    res.json(meeting);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

export default router;