export const analyzeMeeting = async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({
        message: "Transcript is required",
      });
    }

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
              content: `
You are an expert meeting assistant AI.

Return ONLY valid JSON in this format:

{
  "actionItems": [
    {
      "task": "",
      "assignedTo": "",
      "dueDate": ""
    }
  ],
  "decisions": [],
  "summary": ""
}

Rules:
- No explanation
- No markdown
- Only JSON output
              `,
            },
            {
              role: "user",
              content: transcript,
            },
          ],
          temperature: 0.2,
        }),
      }
    );

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        message: "No AI response",
        raw: data,
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({
        message: "AI returned invalid JSON",
        content,
      });
    }

    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({
      message: "AI processing failed",
      error: error.message,
    });
  }
};