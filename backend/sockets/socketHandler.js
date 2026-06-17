import Meeting from "../models/Meeting.js";
import Task from "../models/Task.js";

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // =========================
    // JOIN MEETING
    // =========================
    socket.on("join-meeting", (meetingId) => {
      socket.join(meetingId);
      console.log(`User joined meeting ${meetingId}`);
    });

    // =========================
    // SEND TRANSCRIPT
    // =========================
    socket.on("send-transcript", async (data) => {
      try {
        const { meetingId, text, sender } = data;

        console.log("Received message:", { meetingId, text, sender });

        // =========================
        // SAVE TRANSCRIPT
        // =========================
        await Meeting.findByIdAndUpdate(meetingId, {
          $push: {
            transcript: {
              text,
              sender,
              time: new Date(),
            },
          },
        });

        // =========================
        // SEND LIVE TRANSCRIPT
        // =========================
        io.to(meetingId).emit("receive-transcript", {
          text,
          sender,
          time: new Date(),
        });

        // =========================
        // ENHANCED AI ANALYSIS FOR SUMMARY & DECISIONS
        // =========================
        try {
          const enhancedAnalysis = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                  {
                    role: "system",
                    content: `Analyze this meeting message and extract:
1. Summary (1 short sentence)
2. Decisions (what was agreed upon)
3. Risks (potential problems mentioned)

Return ONLY valid JSON in this exact format:
{
  "summary": "brief summary here",
  "decisions": ["decision 1", "decision 2"],
  "risks": ["risk 1", "risk 2"]
}

If none found, return empty arrays. No explanation, only JSON.`,
                  },
                  {
                    role: "user",
                    content: text,
                  },
                ],
                temperature: 0.2,
              }),
            }
          );

          const enhancedData = await enhancedAnalysis.json();
          const enhancedContent = enhancedData?.choices?.[0]?.message?.content;

          if (enhancedContent) {
            try {
              const parsed = JSON.parse(enhancedContent);
              
              const updateObj = {};
              if (parsed.summary) {
                updateObj.aiSummary = parsed.summary;
              }
              
              await Meeting.findByIdAndUpdate(meetingId, {
                $set: updateObj,
                $push: {
                  decisions: { $each: parsed.decisions || [] },
                  risks: { $each: parsed.risks || [] },
                },
              });
              
              io.to(meetingId).emit("meeting-summary-updated", {
                summary: parsed.summary,
                decisions: parsed.decisions || [],
                risks: parsed.risks || []
              });
              
              console.log("Enhanced analysis saved:", parsed);
            } catch (err) {
              console.log("Enhanced analysis parse error:", err);
            }
          }
        } catch (err) {
          console.log("Enhanced analysis fetch error:", err);
        }

        // =========================
        // ACTION ITEMS EXTRACTION WITH GROQ
        // =========================
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                {
                  role: "system",
                  content: `You are a meeting assistant. Extract ONLY ONE action item from the message if present.
Return ONLY a JSON array with ONE item maximum. 

Examples:
Message: "John should update the website by Friday"
Output: [{"task":"Update the website","assignedTo":"John","dueDate":"Friday"}]

Message: "Kali complete file process tomorrow"
Output: [{"task":"Complete file process","assignedTo":"Kali","dueDate":"tomorrow"}]

Message: "Let's approve the new budget"
Output: [{"task":"Approve new budget","assignedTo":"Team","dueDate":"No deadline"}]

Message: "No action items here"
Output: []

IMPORTANT RULES:
- Extract ONLY the most important action item from the message
- If multiple action items, pick only ONE
- If no clear action item, return []
- Return ONLY valid JSON, no extra text
- Always return an array`,
                },
                {
                  role: "user",
                  content: text,
                },
              ],
              temperature: 0.1,
            }),
          }
        );

        const aiData = await response.json();
        const content = aiData?.choices?.[0]?.message?.content;

        if (!content) {
          console.log("No AI content received");
          return;
        }

        console.log("Raw AI Content:", content);

        // Clean the JSON
        let cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        let actionItems = [];
        
        try {
          actionItems = JSON.parse(cleaned);
          if (!Array.isArray(actionItems)) {
            actionItems = [actionItems];
          }
          console.log("Parsed action items:", actionItems);
        } catch (err) {
          console.log("JSON Parse Error:", cleaned);
          return;
        }

        // =========================
        // CREATE TASKS
        // =========================
        for (const item of actionItems) {
          if (!item.task) {
            console.log("Skipping item without task:", item);
            continue;
          }

          // Check if task already exists in this meeting
          const existingTask = await Task.findOne({
            meetingId: meetingId,
            task: { $regex: new RegExp(item.task, 'i') },
            status: "Pending"
          });

          if (existingTask) {
            console.log("Task already exists, skipping duplicate:", item.task);
            continue;
          }

          console.log("Creating task in database:", item);

          const newTask = await Task.create({
            task: item.task,
            assignedTo: item.assignedTo || "Unassigned",
            dueDate: item.dueDate || "No deadline",
            status: "Pending",
            meetingId: meetingId,
          });

          console.log("✅ Task created with ID:", newTask._id.toString());

          // Save to meeting's actionItems array
          await Meeting.findByIdAndUpdate(meetingId, {
            $push: {
              actionItems: {
                task: item.task,
                assignedTo: item.assignedTo || "Unassigned",
                dueDate: item.dueDate || "No deadline",
              },
            },
          });

          // Emit to frontend
          io.to(meetingId).emit("new-task", newTask);
          
          // Also emit to update team dashboard
          io.emit("task-updated", { meetingId, task: newTask });
        }
      } catch (err) {
        console.error("Socket error:", err);
      }
    });

    // =========================
    // DISCONNECT
    // =========================
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

export default socketHandler;