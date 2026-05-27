// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\server\routes\appData.routes.js

const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

const PASSING_SCORE = 90;

function getGoogleAuth() {
  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT);
  } else {
    credentials = require("../service-account.json");
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

async function getSheetsClient() {
  const auth = getGoogleAuth();

  return google.sheets({
    version: "v4",
    auth
  });
}

async function getSheetValues(range) {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range
  });

  return response.data.values || [];
}

async function appendSheetValues(range, values) {
  const sheets = await getSheetsClient();

  return sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values
    }
  });
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((header) => String(header || "").trim());

  return rows.slice(1).map((row) => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });

    return obj;
  });
}

function normalizeClientName(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();

  if (lower === "buwelo - c" || lower === "buwelo-c" || lower === "buwelo c") {
    return "Buwelo-C";
  }

  if (lower === "buwelo - g" || lower === "buwelo-g" || lower === "buwelo g") {
    return "Buwelo-G";
  }

  if (lower === "telus") return "Telus";
  if (lower === "tep") return "TEP";
  if (lower === "telus/tep") return "Telus/Tep";
  if (lower === "wns") return "WNS";
  if (lower === "concentrix") return "Concentrix";

  return text;
}

function safeNumber(value) {
  const num = Number(String(value || "").replace("%", "").trim());
  return Number.isFinite(num) ? num : 0;
}

function buildCriteriaFromRows(qaType, rows) {
  if (!rows || rows.length < 2) return [];

  return rows
    .slice(1)
    .filter((row) => row[1] && row[2])
    .map((row, index) => {
      const criterion = String(row[1] || "").trim();
      const maxPoints = Number(row[2] || 0);

      return {
        id: `${qaType}-${index + 1}-${criterion}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        number: row[0] || index + 1,
        criterion,
        maxPoints,
        keyChecks: row[5] || "",
        evidenceNotes: row[6] || "",
        formNotes: row[8] || "",
        scoringTreatment: row[7] || "Coaching",
        zeroReason: row[4] || "",
        partialReason: row[3] || "",
        fullReason: row[6] || "",
        rubricKeyChecks: row[5] || "",
        subChecks: []
      };
    });
}

function buildAnalytics(rows, filters = {}) {
  const callCenterFilter = normalizeClientName(filters.callCenter || filters.client || "");
  const officialOnly =
    String(filters.officialOnly || "").toLowerCase() === "true" ||
    filters.officialOnly === true;

  const filtered = rows.filter((row) => {
    const rowCallCenter = normalizeClientName(row["Call Center"] || "");

    if (callCenterFilter && rowCallCenter !== callCenterFilter) return false;

    if (officialOnly) {
      const official = String(row["Official Final Score"] || row["Is Official Final Score"] || "").toLowerCase();
      if (!(official === "yes" || official === "true")) return false;
    }

    return true;
  });

  const total = filtered.length;

  const scores = filtered.map((row) => safeNumber(row["Final %"]));
  const avgScore = total
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / total)
    : 0;

  const passed = filtered.filter((row) => {
    const result = String(row.Result || "").toLowerCase();
    const score = safeNumber(row["Final %"]);

    return result.includes("passed") || score >= PASSING_SCORE;
  }).length;

  const passRate = total ? Math.round((passed / total) * 100) : 0;

  const agentMap = {};
  const evaluatorMap = {};
  const opportunityMap = {};

  filtered.forEach((row) => {
    const agent = row["Agent Name"] || "Unknown Agent";
    const evaluator = row.Evaluator || "Unknown Evaluator";
    const score = safeNumber(row["Final %"]);

    if (!agentMap[agent]) {
      agentMap[agent] = {
        agent,
        count: 0,
        totalScore: 0,
        avgScore: 0,
        latestScore: score,
        latestResult: row.Result || ""
      };
    }

    agentMap[agent].count += 1;
    agentMap[agent].totalScore += score;
    agentMap[agent].avgScore = Math.round(agentMap[agent].totalScore / agentMap[agent].count);
    agentMap[agent].latestScore = score;
    agentMap[agent].latestResult = row.Result || "";

    if (!evaluatorMap[evaluator]) {
      evaluatorMap[evaluator] = {
        evaluator,
        count: 0
      };
    }

    evaluatorMap[evaluator].count += 1;

    const detailsRaw = row["Details JSON"] || "";

    if (detailsRaw) {
      try {
        const details = JSON.parse(detailsRaw);

        details.forEach((item) => {
          if (item.rating === "Partial" || item.rating === "Zero") {
            const key = item.criterion || "Unknown Criterion";

            if (!opportunityMap[key]) {
              opportunityMap[key] = {
                criterion: key,
                count: 0
              };
            }

            opportunityMap[key].count += 1;
          }
        });
      } catch {
        // Ignore invalid JSON rows.
      }
    }
  });

  return {
    total,
    avgScore,
    passRate,
    passed,
    needsImprovement: total - passed,
    agents: Object.values(agentMap).sort((a, b) => a.avgScore - b.avgScore),
    evaluators: Object.values(evaluatorMap).sort((a, b) => b.count - a.count),
    topOpportunities: Object.values(opportunityMap).sort((a, b) => b.count - a.count),
    rows: filtered.slice(-50).reverse()
  };
}

function getEasternDayName() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/New_York"
  }).format(new Date());
}

function getDashboardQaDay(callCenter) {
  const normalized = normalizeClientName(callCenter);

  const schedule = {
    Telus: "Tuesday",
    TEP: "Tuesday",
    "Telus/Tep": "Tuesday",
    "Buwelo-C": "Wednesday",
    "Buwelo-G": "Wednesday",
    WNS: "Thursday",
    Concentrix: "Friday"
  };

  return schedule[normalized] || "";
}

function checkDashboardAccess(callCenter, password) {
  const today = getEasternDayName();
  const qaDay = getDashboardQaDay(callCenter);
  const expectedPassword =
    process.env.MANAGER_DASHBOARD_PASSWORD || "qa2026-junior";

  const isCorrectQaDay = today === qaDay;
  const passwordValid = String(password || "").trim() === expectedPassword;

  if (isCorrectQaDay) {
    return {
      allowed: true,
      needsPassword: false,
      today,
      qaDay,
      message: `${normalizeClientName(callCenter)} dashboard is open today because today is their QA day.`
    };
  }

  if (passwordValid) {
    return {
      allowed: true,
      needsPassword: true,
      today,
      qaDay,
      message: `${normalizeClientName(callCenter)} dashboard opened with manager password. Today is ${today}; their QA day is ${qaDay}.`
    };
  }

  return {
    allowed: false,
    needsPassword: true,
    today,
    qaDay,
    message: `${normalizeClientName(callCenter)} dashboard is locked today. Today is ${today}; their QA day is ${qaDay}. Enter manager password to open it.`
  };
}

router.get("/app-data", async (req, res) => {
  try {
    const customerServiceRows = await getSheetValues("'QA Form'!A1:I");
    const flightsRows = await getSheetValues("'QA Form - Flights'!A1:I");

    const customerServiceCriteria = buildCriteriaFromRows(
      "customerService",
      customerServiceRows
    );

    const flightsCriteria = buildCriteriaFromRows("flights", flightsRows);

    res.json({
      ok: true,
      appName: "QA Form Quiz Coaching Tool",
      passingScore: PASSING_SCORE,
      scheduleReminder: "Weekly QA coaching schedule loaded.",
      todayTeams: [],
      teams: [
        {
          team: "Telus",
          day: "Tuesday"
        },
        {
          team: "TEP",
          day: "Tuesday"
        },
        {
          team: "Buwelo-C",
          day: "Wednesday"
        },
        {
          team: "Buwelo-G",
          day: "Wednesday"
        },
        {
          team: "WNS",
          day: "Thursday"
        },
        {
          team: "Concentrix",
          day: "Friday"
        }
      ],
      criteriaSets: {
        customerService: customerServiceCriteria,
        flights: flightsCriteria
      }
    });
  } catch (error) {
    console.error("APP DATA ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load app data."
    });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const { metadata = {}, result = {}, aiCoaching = "" } = req.body;

    console.log("SUBMIT RECEIVED:", {
      agentName: metadata.agentName,
      callCenter: metadata.callCenter,
      evaluator: metadata.evaluator,
      finalPercent: result.percent,
      result: result.result
    });

    const row = [
      new Date().toLocaleString("en-US", {
        timeZone: "America/New_York"
      }),
      metadata.qaType === "flights" ? "FLYus / Flights" : "Customer Service",
      metadata.evaluator || "",
      metadata.agentName || "",
      normalizeClientName(metadata.callCenter || ""),
      metadata.callId || "",
      metadata.itineraryNumber || "",
      metadata.qaDate || "",
      result.score || 0,
      result.maxScore || 0,
      result.percent || 0,
      result.result || "",
      result.criticalGateFailed ? "YES" : "NO",
      result.summary || aiCoaching || "",
      metadata.evaluationMode || "",
      metadata.evaluatorRole || "",
      metadata.isOfficialFinal ? "YES" : "NO",
      JSON.stringify(result.details || [])
    ];

    await appendSheetValues("'Responses'!A:R", [row]);

    res.json({
      ok: true,
      message: "QA response saved successfully.",
      saved: {
        agentName: metadata.agentName,
        callCenter: normalizeClientName(metadata.callCenter),
        finalPercent: result.percent,
        result: result.result
      }
    });
  } catch (error) {
    console.error("SUBMIT ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to save QA response."
    });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const callCenter = req.query.callCenter || "";
    const password = req.query.password || "";

    const access = checkDashboardAccess(callCenter, password);

    if (!access.allowed) {
      return res.status(403).json({
        ok: false,
        access,
        message: access.message
      });
    }

    const responseRows = await getSheetValues("'Responses'!A1:R");
    const rows = rowsToObjects(responseRows);

    const dashboard = buildAnalytics(rows, {
      ...req.query,
      callCenter
    });

    res.json({
      ok: true,
      access,
      dashboard
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load dashboard."
    });
  }
});

router.get("/past-submissions", async (req, res) => {
  try {
    const responseRows = await getSheetValues("'Responses'!A1:R");
    const rows = rowsToObjects(responseRows);

    res.json({
      ok: true,
      rows
    });
  } catch (error) {
    console.error("PAST SUBMISSIONS ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load past submissions."
    });
  }
});

router.get("/export-csv", async (req, res) => {
  try {
    const responseRows = await getSheetValues("'Responses'!A1:R");
    const rows = rowsToObjects(responseRows);

    const csvHeaders = [
      "Timestamp",
      "QA Type",
      "Evaluator",
      "Agent Name",
      "Call Center",
      "Call ID",
      "Itinerary Number",
      "QA Date",
      "Score",
      "Max Score",
      "Final %",
      "Result",
      "Critical Gate Failed?",
      "Coaching Summary",
      "Evaluation Mode",
      "Evaluator Role",
      "Official Final Score"
    ];

    const csvRows = [
      csvHeaders.join(","),
      ...rows.map((row) =>
        csvHeaders
          .map((header) => `"${String(row[header] || "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=qa-results.csv");
    res.send(csvRows.join("\n"));
  } catch (error) {
    console.error("EXPORT CSV ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to export CSV."
    });
  }
});

module.exports = router;