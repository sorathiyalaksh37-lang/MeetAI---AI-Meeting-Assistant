import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();

// =========================
// SEARCH IN MEETING TRANSCRIPT
// =========================
router.get("/meeting/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { q } = req.query; // search query
    
    if (!q || q.trim() === "") {
      return res.json({ 
        results: [], 
        count: 0,
        message: "No search query provided" 
      });
    }
    
    const meeting = await Meeting.findById(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    
    // Search in transcript
    const searchTerm = q.toLowerCase();
    const results = meeting.transcript.filter(item => 
      item.text.toLowerCase().includes(searchTerm)
    );
    
    // Highlight matches
    const highlightedResults = results.map(item => ({
      ...item,
      highlightedText: item.text.replace(
        new RegExp(`(${searchTerm})`, 'gi'),
        '<mark class="bg-yellow-500/50 text-white px-1 rounded">$1</mark>'
      )
    }));
    
    res.json({
      results: highlightedResults,
      count: results.length,
      searchTerm: q
    });
    
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================
// SEARCH ACROSS ALL MEETINGS
// =========================
router.get("/all", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === "") {
      return res.json({ results: [], count: 0 });
    }
    
    const allMeetings = await Meeting.find().sort({ createdAt: -1 });
    const searchTerm = q.toLowerCase();
    const results = [];
    
    for (const meeting of allMeetings) {
      const matchingMessages = meeting.transcript.filter(item =>
        item.text.toLowerCase().includes(searchTerm)
      );
      
      if (matchingMessages.length > 0) {
        results.push({
          meetingId: meeting._id,
          meetingTitle: meeting.title,
          meetingDate: meeting.createdAt,
          matches: matchingMessages
        });
      }
    }
    
    res.json({
      results,
      count: results.length,
      searchTerm: q
    });
    
  } catch (err) {
    console.error("Global search error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;