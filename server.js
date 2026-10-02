require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

/* =========================
   FILE SETUP
========================= */

const scoresFile = path.join(__dirname, "scores.json");

if (!fs.existsSync(scoresFile)) {
  fs.writeFileSync(scoresFile, "[]", "utf8");
}

/* =========================
   GEMINI MODELS
========================= */

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

/* =========================
   BASIC HELPERS
========================= */

function clamp(value, min = 0, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(max, number));
}

function cleanText(value, maxLength = 5000) {
  return String(value || "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================
   ERROR HELPERS
========================= */

function getErrorMessage(error) {
  if (!error) return "Unknown error";

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return String(error.message);
  }

  if (error.error?.message) {
    return String(error.error.message);
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Gemini error";
  }
}

function getErrorStatus(error) {
  return (
    error?.status ||
    error?.code ||
    error?.error?.status ||
    error?.error?.code ||
    null
  );
}

function isTemporaryGeminiError(error) {
  const status = Number(getErrorStatus(error));

  const message = getErrorMessage(error).toLowerCase();

  const temporaryStatuses = [
    408,
    429,
    500,
    502,
    503,
    504
  ];

  if (temporaryStatuses.includes(status)) {
    return true;
  }

  return (
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("temporarily") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

/* =========================
   JSON PARSER
========================= */

function extractJson(text) {
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let cleaned = String(text).trim();

  // Remove markdown code fences
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Direct JSON
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try extracting first JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(possibleJson);
    } catch {}
  }

  throw new Error("Gemini returned invalid JSON.");
}

/* =========================
   NORMALIZE AI RESULT
========================= */

function normalizeEvaluation(data) {
  const strengths = Array.isArray(data?.strengths)
    ? data.strengths
        .map(item => cleanText(item, 300))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const improvements = Array.isArray(data?.improvements)
    ? data.improvements
        .map(item => cleanText(item, 300))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    score: Math.round(clamp(data?.score)),
    confidence: Math.round(clamp(data?.confidence)),
    communication: Math.round(clamp(data?.communication)),
    technicalAccuracy: Math.round(clamp(data?.technicalAccuracy)),
    relevance: Math.round(clamp(data?.relevance)),

    strengths,

    improvements,

    feedback: cleanText(
      data?.feedback || "No detailed feedback was returned.",
      2000
    )
  };
}

/* =========================
   GEMINI REQUEST
========================= */

async function callGemini(prompt) {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  let lastError = null;
  const failedModels = [];

  for (const model of GEMINI_MODELS) {
    console.log(`\n🤖 Trying Gemini model: ${model}`);

    // Maximum 2 attempts per model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,

          config: {
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingLevel: "low"
            }
          }
        });

        const text =
          typeof response?.text === "string"
            ? response.text
            : "";

        if (!text.trim()) {
          throw new Error("Gemini returned an empty response.");
        }

        console.log(`✅ Gemini success: ${model}`);

        return {
          model,
          text
        };

      } catch (error) {
        lastError = error;

        const message = getErrorMessage(error);
        const status = getErrorStatus(error);

        console.log(
          `❌ ${model} attempt ${attempt} failed:`,
          status || "",
          message
        );

        const temporary = isTemporaryGeminiError(error);

        // Don't retry invalid API key / permission / bad request
        if (!temporary) {
          failedModels.push({
            model,
            status,
            message
          });

          break;
        }

        // Retry temporary issue once
        if (attempt === 1) {
          console.log(`⏳ Retrying ${model}...`);
          await sleep(1200);
        } else {
          failedModels.push({
            model,
            status,
            message
          });
        }
      }
    }
  }

  const finalMessage = getErrorMessage(lastError);

  const error = new Error(finalMessage);

  error.failedModels = failedModels;

  error.originalStatus = getErrorStatus(lastError);

  throw error;
}

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "running",
    gemini: Boolean(GEMINI_API_KEY),
    app: "Virexa AI",
    models: GEMINI_MODELS
  });
});

/* =========================
   GEMINI TEST ENDPOINT
========================= */

app.get("/api/test-ai", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      code: "MISSING_API_KEY",
      message: "GEMINI_API_KEY is missing from .env"
    });
  }

  try {
    const result = await callGemini(`
You are testing the AI engine of Virexa AI.

Return ONLY valid JSON:

{
  "status": "ok",
  "message": "Gemini AI is working correctly."
}

Do not include markdown.
`);

    const parsed = extractJson(result.text);

    return res.json({
      success: true,
      model: result.model,
      result: parsed
    });

  } catch (error) {
    console.error("\n🚨 GEMINI TEST FAILED");
    console.error(error.failedModels || error);

    return res.status(503).json({
      success: false,
      code: "GEMINI_TEST_FAILED",

      message:
        "Gemini API test failed. Check the model/API access in the terminal.",

      details: {
        status: error.originalStatus || null,
        failedModels: error.failedModels || []
      }
    });
  }
});

/* =========================
   AI ANSWER EVALUATION
========================= */

app.post("/api/evaluate", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        code: "MISSING_API_KEY",
        error: "Gemini API key is missing. Check your .env file."
      });
    }

    const question = cleanText(req.body.question, 1500);
    const answer = cleanText(req.body.answer, 12000);
    const difficulty = cleanText(
      req.body.difficulty || "Basic",
      100
    );

    if (!question) {
      return res.status(400).json({
        success: false,
        code: "QUESTION_REQUIRED",
        error: "Interview question is required."
      });
    }

    if (!answer) {
      return res.status(400).json({
        success: false,
        code: "ANSWER_REQUIRED",
        error: "Please provide an interview answer before analysing."
      });
    }

    console.log("\n==============================");
    console.log("🧠 VIREXA AI ANALYSIS");
    console.log("==============================");
    console.log("Question:", question);
    console.log("Difficulty:", difficulty);
    console.log("Answer length:", answer.length);

    const prompt = `
You are the AI evaluation engine for Virexa AI, an intelligent interview coaching application.

Evaluate the candidate's interview answer.

Interview question:
${question}

Difficulty:
${difficulty}

Candidate answer:
${answer}

Evaluate ONLY the answer that the candidate actually gave.

Return ONLY valid JSON.

Required format:

{
  "score": 0,
  "confidence": 0,
  "communication": 0,
  "technicalAccuracy": 0,
  "relevance": 0,
  "strengths": [],
  "improvements": [],
  "feedback": ""
}

Scoring rules:

score:
Overall quality of the answer from 0 to 100.

confidence:
How confidently the answer is expressed based only on wording and structure.
Do not make psychological or medical claims.

communication:
Clarity, organization and professional communication from 0 to 100.

technicalAccuracy:
Technical correctness from 0 to 100.
If the question is non-technical, judge factual accuracy and usefulness instead.

relevance:
How directly the answer addresses the question from 0 to 100.

strengths:
2 to 4 short specific strengths.

improvements:
2 to 4 short practical improvements.

feedback:
A concise useful paragraph for the candidate.

Important:
- Do not invent information.
- Do not claim to detect mental health.
- Do not claim to detect actual emotions.
- Do not judge personality.
- Do not use markdown.
- Return JSON only.
`;

    const result = await callGemini(prompt);

    const parsed = extractJson(result.text);

    const evaluation = normalizeEvaluation(parsed);

    console.log("✅ Evaluation completed using:", result.model);

    return res.json({
      success: true,
      model: result.model,
      evaluation
    });

  } catch (error) {
    console.error("\n🚨 AI EVALUATION FAILED");
    console.error(error.failedModels || error);

    const temporary = isTemporaryGeminiError(error);

    return res.status(temporary ? 503 : 500).json({
      success: false,

      code: temporary
        ? "GEMINI_UNAVAILABLE"
        : "AI_EVALUATION_FAILED",

      retryable: temporary,

      error: temporary
        ? "Gemini AI is temporarily busy. Please try Analyse Answer again in a moment."
        : "AI evaluation failed. Please check the server terminal for details.",

      details: {
        status: error.originalStatus || null,
        failedModels: error.failedModels || []
      }
    });
  }
});

/* =========================
   SAVE INTERVIEW SCORE
========================= */

app.post("/api/score", (req, res) => {
  try {
    const body = req.body || {};

    const scoreData = {
      question: cleanText(body.question, 1500),

      difficulty: cleanText(
        body.difficulty || "Basic",
        100
      ),

      confidence: Math.round(
        clamp(body.confidence)
      ),

      stress: Math.round(
        clamp(body.stress)
      ),

      // Answer clarity.
      // "honesty" is accepted only for compatibility
      // with older frontend versions.
      clarity: Math.round(
        clamp(
          body.clarity ??
          body.honesty ??
          0
        )
      ),

      // Backward compatibility
      honesty: Math.round(
        clamp(
          body.clarity ??
          body.honesty ??
          0
        )
      ),

      aiScore: Math.round(
        clamp(
          body.aiScore ??
          body.score ??
          0
        )
      ),

      communication: Math.round(
        clamp(body.communication)
      ),

      technicalAccuracy: Math.round(
        clamp(body.technicalAccuracy)
      ),

      relevance: Math.round(
        clamp(body.relevance)
      ),

      aiFeedback: cleanText(
        body.aiFeedback || "",
        2000
      ),

      timestamp: new Date().toISOString()
    };

    const existingScores = JSON.parse(
      fs.readFileSync(scoresFile, "utf8")
    );

    existingScores.push(scoreData);

    fs.writeFileSync(
      scoresFile,
      JSON.stringify(existingScores, null, 2),
      "utf8"
    );

    res.json({
      success: true,
      message: "Interview score saved successfully.",
      score: scoreData
    });

  } catch (error) {
    console.error("Score save error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to save interview score."
    });
  }
});

/* =========================
   GET ALL SCORES
========================= */

app.get("/api/scores", (req, res) => {
  try {
    const scores = JSON.parse(
      fs.readFileSync(scoresFile, "utf8")
    );

    res.json({
      success: true,
      scores
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Unable to read scores."
    });
  }
});

/* =========================
   SUMMARY
========================= */

app.get("/api/summary", (req, res) => {
  try {
    const scores = JSON.parse(
      fs.readFileSync(scoresFile, "utf8")
    );

    if (!scores.length) {
      return res.json({
        success: true,
        totalInterviews: 0,
        averageConfidence: 0,
        averageClarity: 0,
        averageStress: 0,
        averageAI: 0,
        averageCommunication: 0,
        averageTechnical: 0,
        averageRelevance: 0,
        suggestions: [
          "Complete your first interview to generate performance insights."
        ]
      });
    }

    const average = (field, fallback = 0) => {
      const values = scores
        .map(item => Number(item[field]))
        .filter(Number.isFinite);

      if (!values.length) return fallback;

      return Math.round(
        values.reduce((sum, value) => sum + value, 0) /
        values.length
      );
    };

    const averageConfidence = average("confidence");
    const averageClarity = Math.max(
      average("clarity"),
      average("honesty")
    );

    const averageStress = average("stress");

    const averageAI = average("aiScore");

    const averageCommunication =
      average("communication");

    const averageTechnical =
      average("technicalAccuracy");

    const averageRelevance =
      average("relevance");

    const suggestions = [];

    if (averageConfidence < 70) {
      suggestions.push(
        "Practice answering common interview questions aloud to improve confidence."
      );
    }

    if (averageCommunication < 70) {
      suggestions.push(
        "Keep answers structured and use shorter, clearer sentences."
      );
    }

    if (averageTechnical < 70) {
      suggestions.push(
        "Review core technical concepts and explain them with simple examples."
      );
    }

    if (averageRelevance < 70) {
      suggestions.push(
        "Focus directly on what the interviewer is asking before adding extra details."
      );
    }

    if (averageClarity < 70) {
      suggestions.push(
        "Use a clear structure such as Situation → Task → Action → Result when appropriate."
      );
    }

    if (!suggestions.length) {
      suggestions.push(
        "Keep practicing and maintain the same level of answer quality."
      );
    }

    res.json({
      success: true,

      totalInterviews: scores.length,

      averageConfidence,
      averageClarity,
      averageStress,

      averageAI,

      averageCommunication,
      averageTechnical,
      averageRelevance,

      suggestions
    });

  } catch (error) {
    console.error("Summary error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to generate performance summary."
    });
  }
});

/* =========================
   404 API
========================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found."
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("🚀 VIREXA AI SERVER");
  console.log("======================================");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(
    `🔑 Gemini API Key: ${
      GEMINI_API_KEY ? "Configured ✅" : "Missing ❌"
    }`
  );
  console.log("");
  console.log("🤖 Gemini models:");
  GEMINI_MODELS.forEach(model => {
    console.log(`   • ${model}`);
  });
  console.log("");
  console.log("🧪 AI Test:");
  console.log(`   http://localhost:${PORT}/api/test-ai`);
  console.log("");
  console.log("❤️ Health:");
  console.log(`   http://localhost:${PORT}/api/health`);
  console.log("======================================");
  console.log("");
});