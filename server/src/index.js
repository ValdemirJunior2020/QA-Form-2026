// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\server\index.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const appDataRoutes = require("./routes/appData.routes");

const app = express();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://qa-form-2026.netlify.app",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("QA Form Quiz Server is running.");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "QA Form API is running",
    port: PORT,
    allowedOrigins,
    time: new Date().toISOString()
  });
});

app.post("/api/ai-coaching", async (req, res) => {
  try {
    const { metadata = {}, result = {} } = req.body;

    const details = Array.isArray(result.details) ? result.details : [];

    const missedItems = details.filter(
      (item) => item.rating === "Partial" || item.rating === "Zero"
    );

    const fullItems = details.filter(
      (item) => item.rating === "Full" || item.rating === "N/A"
    );

    const agentName = metadata.agentName || "the agent";
    const evaluator = metadata.evaluator || "the evaluator";
    const callCenter = metadata.callCenter || "the call center";

    const qaType =
      metadata.qaType === "flights"
        ? "FLYus / Flights QA"
        : "Customer Service QA";

    const score = result.percent ?? 0;
    const finalResult = result.result || "NEEDS IMPROVEMENT";

    if (!missedItems.length && Number(score) >= 90) {
      return res.json({
        ok: true,
        coaching: `QA Coaching Summary for ${agentName}

Evaluator: ${evaluator}
Call Center: ${callCenter}
QA Type: ${qaType}
Final Score: ${score}%
Result: ${finalResult}

Overall Coaching:
Strong performance from ${agentName}. The agent met the expected behaviors for this QA review.

What the agent did well:
${fullItems
  .map(
    (item, index) =>
      `${index + 1}. ${item.criterion} — ${item.earned}/${item.maxPoints} pts`
  )
  .join("\n")}

Recommended Coaching Message:
${agentName}, this was a strong QA result. Continue following the rubric, keep the same level of ownership, and maintain clear documentation on every call.

Next Steps:
1. Reinforce the positive behaviors.
2. Encourage consistency on the next calls.
3. Continue monitoring for quality and documentation accuracy.`
      });
    }

    const missedText = missedItems
      .map((item, index) => {
        return `${index + 1}. ${item.criterion}
Rating: ${item.rating || "Not selected"}
Points: ${item.earned || 0} / ${item.maxPoints || 0}
Notes: ${item.notes || "No notes added."}
Feedback: ${item.feedback || "No feedback available."}`;
      })
      .join("\n\n");

    const strengthsText = fullItems.length
      ? fullItems
          .slice(0, 5)
          .map((item, index) => {
            return `${index + 1}. ${item.criterion} — ${item.earned}/${item.maxPoints} pts`;
          })
          .join("\n")
      : "No full-credit strengths were found in this review.";

    const coaching = `QA Coaching Summary for ${agentName}

Evaluator: ${evaluator}
Call Center: ${callCenter}
QA Type: ${qaType}
Final Score: ${score}%
Result: ${finalResult}

Overall Coaching:
${agentName} needs coaching based on the missed or partial QA items below. The coaching should be direct, specific, and focused on the exact behaviors that affected the score. Do not coach only by saying “do better.” The agent needs to understand what was missed, what the rubric expected, and what the correct behavior should be next time.

Main Coaching Opportunities:
${missedText || "No missed items were found, but the score still needs review."}

What the agent did well:
${strengthsText}

Recommended Coaching Message:
${agentName}, this QA review shows there are specific behaviors that need improvement. The biggest focus should be on the criteria marked Partial or Zero. For each missed item, make sure you understand what the rubric expected, what happened on the call, and what you need to do differently on the next call. The goal is not only to improve the score, but to make the customer experience more complete, accurate, professional, and compliant.

Next Steps:
1. Review each missed criterion with the agent.
2. Ask the agent to explain what should have been done differently.
3. Give one clear example of the correct behavior.
4. Have the agent repeat the correct process back.
5. Monitor the next call for improvement.`;

    return res.json({
      ok: true,
      coaching
    });
  } catch (error) {
    console.error("AI COACHING ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Failed to generate coaching."
    });
  }
});

app.use("/api", appDataRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    ok: false,
    message: error.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});