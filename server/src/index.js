// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\server\src\index.js

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import { google } from "googleapis";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 5000;
const PASSING_SCORE = 90;

const allowedOrigins = [
  "http://localhost:5173",
  "https://qa-form-2026.netlify.app",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());
app.use(express.json({ limit: "10mb" }));

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeId(value) {
  return normalize(value).replace(/\s+/g, "_").substring(0, 90);
}

function getGoogleSheetsClient() {
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("Missing SPREADSHEET_ID in environment variables.");
  }

  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes
    });

    return google.sheets({
      version: "v4",
      auth
    });
  }

  const jsonFileName = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "service-account.json";
  const keyFilePath = path.join(__dirname, "..", jsonFileName);

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(
      `Service account JSON file not found at: ${keyFilePath}. For Render, use GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT instead.`
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes
  });

  return google.sheets({
    version: "v4",
    auth
  });
}

async function getSheetValues(sheets, spreadsheetId, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    return response.data.values || [];
  } catch (error) {
    console.warn(`Could not load range ${range}:`, error.message);
    return [];
  }
}

async function appendSheetValues(sheets, spreadsheetId, range, values) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values
    }
  });

  return response.data;
}

function buildRubricMap(rubricRows) {
  const map = {};

  for (let i = 1; i < rubricRows.length; i++) {
    const row = rubricRows[i];
    const criterion = row[1];

    if (!criterion) continue;

    map[normalize(criterion)] = {
      criterion: String(criterion || "").trim(),
      maxPoints: row[2] || "",
      partialScoreExample: row[3] || "",
      zeroReason: row[4] || "",
      partialReason: row[5] || "",
      fullReason: row[6] || "",
      rubricKeyChecks: row[7] || "",
      scoringTreatment: row[8] || ""
    };
  }

  return map;
}

function findRubricForCriterion(rubricMap, criterion) {
  const normalizedCriterion = normalize(criterion);

  if (rubricMap[normalizedCriterion]) {
    return rubricMap[normalizedCriterion];
  }

  const keys = Object.keys(rubricMap);

  for (const key of keys) {
    if (normalizedCriterion.includes(key) || key.includes(normalizedCriterion)) {
      return rubricMap[key];
    }
  }

  return {};
}

function buildSubChecks(qaType, criterion, keyChecks, notes) {
  const text = normalize(`${criterion} ${keyChecks || ""} ${notes || ""}`);

  const isReservationSearch =
    qaType === "customerService" &&
    (
      text.includes("must confirm and request all relevant information") ||
      text.includes("reservation search effort") ||
      text.includes("probing questions")
    );

  if (isReservationSearch) {
    return [
      { id: "confirmed_first_last_name", group: "Required verification before process", label: "Confirmed caller/customer first and last name." },
      { id: "confirmed_itinerary_number", group: "Required verification before process", label: "Confirmed itinerary number." },
      { id: "confirmed_hotel_name", group: "Required verification before process", label: "Confirmed hotel name." },
      { id: "confirmed_booking_dates", group: "Required verification before process", label: "Confirmed booking dates." },
      { id: "checked_if_information_matches", group: "Required verification before process", label: "Checked if the information matched before triggering any process." },
      { id: "got_email_if_not_matching", group: "If information is not matching", label: "If something was not matching, agent got the guest’s email address." },
      { id: "got_phone_if_not_matching", group: "If information is not matching", label: "If something was not matching, agent got the guest’s phone number." },
      { id: "search_by_itinerary_or_reservation", group: "Required search effort", label: "Searched by itinerary/reservation number." },
      { id: "search_by_guest_name_email_phone", group: "Required search effort", label: "Searched by guest name, email, and phone number associated with the booking/reservation." },
      { id: "checked_alternate_spelling", group: "Required search effort", label: "Checked alternate spelling of the guest name." },
      { id: "searched_confirmation_number", group: "Required search effort", label: "Searched by any confirmation number the guest has." },
      { id: "reviewed_three_months_records", group: "Required search effort", label: "Reviewed reservation records going back at least 3 months when searching by guest details." },
      { id: "asked_another_guest_name_email_phone", group: "Probing questions", label: "Asked if the reservation could be under another guest’s name, email, or phone number." },
      { id: "asked_email_phone_associated", group: "Probing questions", label: "Asked what email or phone number is associated with the booking/reservation." },
      { id: "asked_how_booked", group: "Probing questions", label: "Asked how the guest booked the reservation." },
      { id: "asked_booking_channel", group: "Probing questions", label: "Asked if the booking was made online, by phone, directly with the hotel, or through another travel site." },
      { id: "asked_email_spam_confirmation", group: "Probing questions", label: "Asked if the guest checked email and spam folder for the confirmation." },
      { id: "asked_company_website_confirmation", group: "Probing questions", label: "Asked what company or website the confirmation shows." },
      { id: "asked_bank_charge_descriptor", group: "Probing questions", label: "Asked how the charges appear in the guest’s bank." },
      { id: "asked_credit_card_receipt_charge", group: "Probing questions", label: "Asked who the credit card receipt shows made the charge." }
    ];
  }

  if (
    qaType === "flights" &&
    (
      text.includes("verification") ||
      text.includes("flyus") ||
      text.includes("flight") ||
      text.includes("ticket") ||
      text.includes("tier") ||
      text.includes("escalation")
    )
  ) {
    return [
      { id: "verified_first_last_name", group: "Flight verification", label: "Verified passenger/customer first and last name." },
      { id: "verified_reservation_or_itinerary", group: "Flight verification", label: "Verified flight reservation number or itinerary number." },
      { id: "confirmed_reason_for_contact", group: "Flight verification", label: "Confirmed the reason for contact before taking action." },
      { id: "created_flyus_ticket", group: "FLYus process", label: "Created the FLYus Support Ticket when required." },
      { id: "explained_tier_2_workflow", group: "FLYus process", label: "Explained the Tier 2 workflow / next step clearly." },
      { id: "urgent_airport_escalation", group: "FLYus process", label: "Used urgent airport escalation path when applicable." },
      { id: "set_24_hour_expectation", group: "FLYus process", label: "Set the correct 24-hour follow-up expectation when applicable." }
    ];
  }

  return [];
}

function buildCriteriaFromRows(qaType, qaRows, rubricRows) {
  const rubricMap = buildRubricMap(rubricRows);
  const criteria = [];

  for (let i = 0; i < qaRows.length; i++) {
    const row = qaRows[i];

    const number = row[0];
    const criterion = row[1];
    const maxPoints = row[2];
    const keyChecks = row[5];
    const evidenceNotes = row[6];
    const notes = row[8];

    if (!criterion) continue;
    if (maxPoints === "" || maxPoints === null || maxPoints === undefined) continue;
    if (Number.isNaN(Number(maxPoints))) continue;
    if (String(criterion).toLowerCase().includes("criterion")) continue;

    const cleanCriterion = String(criterion).trim();
    const rubric = findRubricForCriterion(rubricMap, cleanCriterion);

    criteria.push({
      id: makeId(`${qaType}_${cleanCriterion}`),
      qaType,
      number: number || criteria.length + 1,
      criterion: cleanCriterion,
      maxPoints: Number(maxPoints),
      keyChecks: String(keyChecks || "").trim(),
      evidenceNotes: String(evidenceNotes || "").trim(),
      notes: String(notes || "").trim(),
      zeroReason: rubric.zeroReason || "",
      partialReason: rubric.partialReason || "",
      fullReason: rubric.fullReason || "",
      rubricKeyChecks: rubric.rubricKeyChecks || "",
      scoringTreatment: rubric.scoringTreatment || "",
      subChecks: buildSubChecks(qaType, cleanCriterion, keyChecks, notes)
    });
  }

  return criteria;
}

function ratingToPoints(rating, maxPoints) {
  if (rating === "Full") return Number(maxPoints || 0);
  if (rating === "Partial") return Number(maxPoints || 0) / 2;
  if (rating === "Zero") return 0;
  if (rating === "N/A") return null;
  return 0;
}

function calculateScore(criteria = [], ratings = {}) {
  let earned = 0;
  let possible = 0;
  let criticalFailure = false;

  const details = criteria.map((item) => {
    const rating = ratings[item.id]?.rating || ratings[item.id] || "Full";
    const notes = ratings[item.id]?.notes || "";

    const points = ratingToPoints(rating, item.maxPoints);

    if (points !== null) {
      earned += points;
      possible += Number(item.maxPoints || 0);
    }

    if (rating === "Zero" && normalize(item.scoringTreatment).includes("critical")) {
      criticalFailure = true;
    }

    return {
      id: item.id,
      criterion: item.criterion,
      rating,
      earned: points === null ? 0 : points,
      maxPoints: points === null ? 0 : Number(item.maxPoints || 0),
      notes,
      sectionName: item.sectionName || "General"
    };
  });

  const finalPercent = possible ? Math.round((earned / possible) * 100) : 0;

  return {
    earned,
    possible,
    finalPercent: criticalFailure ? 0 : finalPercent,
    result: criticalFailure || finalPercent < PASSING_SCORE ? "Needs Improvement" : "Passed",
    criticalFailure,
    details
  };
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

  if (lower === "telus/tep") return "Telus/Tep";
  if (lower === "telus") return "Telus";
  if (lower === "tep") return "TEP";
  if (lower.includes("buwelo") && lower.includes("c")) return "Buwelo-C";
  if (lower.includes("buwelo") && lower.includes("g")) return "Buwelo-G";
  if (lower === "wns") return "WNS";
  if (lower === "concentrix") return "Concentrix";

  return text;
}

function safeNumber(value) {
  const number = Number(String(value || "").replace("%", "").trim());
  return Number.isFinite(number) ? number : 0;
}

function parseJsonField(value) {
  try {
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pickValue(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== "") {
      return row[name];
    }
  }

  return "";
}

function safeDateText(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return text.slice(0, 10);
}

function getResponseFields(row) {
  const timestamp = pickValue(row, ["Timestamp", "Created At", "Submitted At", "Date Submitted"]);
  const qaDate = pickValue(row, ["QA Date", "Date", "Evaluation Date"]);

  const callCenter = normalizeClientName(
    pickValue(row, ["Call Center", "Client", "Team", "Vendor", "CallCenter"])
  );

  const agentName = pickValue(row, ["Agent Name", "Agent", "AgentName"]);
  const evaluator = pickValue(row, ["Evaluator", "QA Evaluator", "Leader", "Manager"]);
  const qaType = pickValue(row, ["QA Type", "Type", "Form Type"]);

  const finalPercent = safeNumber(
    pickValue(row, ["Final %", "Final%", "Final Percent", "Percentage", "Score %", "Score"])
  );

  const result = pickValue(row, ["Result", "Final Result", "Status"]);
  const officialFinal = pickValue(row, ["Official Final Score", "Official Final", "Is Official Final"]);

  const detailsJson = pickValue(row, [
    "Details JSON",
    "Criteria Scores JSON",
    "Criteria JSON",
    "Details",
    "Score Details"
  ]);

  return {
    timestamp,
    qaDate,
    dateKey: safeDateText(qaDate || timestamp),
    callCenter,
    agentName: agentName || "Unknown Agent",
    evaluator: evaluator || "Unknown Evaluator",
    qaType,
    finalPercent,
    result,
    officialFinal,
    details: parseJsonField(detailsJson)
  };
}

function buildAnalytics(rows, filters = {}) {
  const client = String(filters.client || "").trim();
  const agentName = String(filters.agentName || "").toLowerCase().trim();
  const dateFrom = String(filters.dateFrom || "").trim();
  const dateTo = String(filters.dateTo || "").trim();

  const mappedRows = rows.map((row) => ({
    raw: row,
    fields: getResponseFields(row)
  }));

  const filtered = mappedRows.filter(({ fields }) => {
    if (client && fields.callCenter !== normalizeClientName(client)) return false;
    if (agentName && !String(fields.agentName || "").toLowerCase().includes(agentName)) return false;
    if (dateFrom && fields.dateKey && fields.dateKey < dateFrom) return false;
    if (dateTo && fields.dateKey && fields.dateKey > dateTo) return false;

    return true;
  });

  const total = filtered.length;
  const scores = filtered.map(({ fields }) => fields.finalPercent);
  const avgScore = total ? Math.round(scores.reduce((sum, score) => sum + score, 0) / total) : 0;

  const passed = filtered.filter(({ fields }) => {
    const resultText = normalize(fields.result);
    return resultText.includes("passed") || fields.finalPercent >= PASSING_SCORE;
  }).length;

  const passRate = total ? Math.round((passed / total) * 100) : 0;

  const agentMap = {};
  const clientMap = {};
  const trendMap = {};
  const criteriaMap = {};

  filtered.forEach(({ raw, fields }) => {
    const score = fields.finalPercent;
    const dateKey = fields.dateKey || "No Date";

    if (!agentMap[fields.agentName]) {
      agentMap[fields.agentName] = {
        agent: fields.agentName,
        count: 0,
        totalScore: 0,
        avgScore: 0,
        latestScore: score,
        latestResult: fields.result || ""
      };
    }

    agentMap[fields.agentName].count += 1;
    agentMap[fields.agentName].totalScore += score;
    agentMap[fields.agentName].avgScore = Math.round(agentMap[fields.agentName].totalScore / agentMap[fields.agentName].count);
    agentMap[fields.agentName].latestScore = score;
    agentMap[fields.agentName].latestResult = fields.result || "";

    if (!clientMap[fields.callCenter]) {
      clientMap[fields.callCenter] = {
        client: fields.callCenter || "Unknown Client",
        count: 0,
        totalScore: 0,
        avgScore: 0
      };
    }

    clientMap[fields.callCenter].count += 1;
    clientMap[fields.callCenter].totalScore += score;
    clientMap[fields.callCenter].avgScore = Math.round(clientMap[fields.callCenter].totalScore / clientMap[fields.callCenter].count);

    if (!trendMap[dateKey]) {
      trendMap[dateKey] = {
        date: dateKey,
        count: 0,
        totalScore: 0,
        avgScore: 0
      };
    }

    trendMap[dateKey].count += 1;
    trendMap[dateKey].totalScore += score;
    trendMap[dateKey].avgScore = Math.round(trendMap[dateKey].totalScore / trendMap[dateKey].count);

    fields.details.forEach((detail) => {
      const criterion = detail.criterion || detail.name || detail.label || "Unknown Criterion";
      const rating = detail.rating || "";
      const earned = safeNumber(detail.earned);
      const maxPoints = safeNumber(detail.maxPoints);
      const sectionName = detail.sectionName || detail.section || detail.group || "General";

      if (!criteriaMap[criterion]) {
        criteriaMap[criterion] = {
          criterion,
          sectionName,
          total: 0,
          full: 0,
          partial: 0,
          zero: 0,
          na: 0,
          earned: 0,
          possible: 0,
          missed: 0,
          avgPercent: 0
        };
      }

      criteriaMap[criterion].total += 1;
      criteriaMap[criterion].earned += earned;
      criteriaMap[criterion].possible += maxPoints;

      if (rating === "Full") criteriaMap[criterion].full += 1;
      else if (rating === "N/A") criteriaMap[criterion].na += 1;
      else if (rating === "Partial") {
        criteriaMap[criterion].partial += 1;
        criteriaMap[criterion].missed += 1;
      } else if (rating === "Zero") {
        criteriaMap[criterion].zero += 1;
        criteriaMap[criterion].missed += 1;
      }

      criteriaMap[criterion].avgPercent = criteriaMap[criterion].possible
        ? Math.round((criteriaMap[criterion].earned / criteriaMap[criterion].possible) * 100)
        : 0;
    });

    raw.__analyticsFields = fields;
  });

  return {
    total,
    avgScore,
    passRate,
    passed,
    needsImprovement: total - passed,
    rows: filtered.slice(-75).reverse().map(({ raw, fields }) => ({
      timestamp: fields.timestamp,
      qaDate: fields.qaDate,
      dateKey: fields.dateKey,
      callCenter: fields.callCenter,
      agentName: fields.agentName,
      evaluator: fields.evaluator,
      qaType: fields.qaType,
      finalPercent: fields.finalPercent,
      result: fields.result,
      officialFinal: fields.officialFinal,
      raw
    })),
    agents: Object.values(agentMap).sort((a, b) => a.avgScore - b.avgScore),
    clients: Object.values(clientMap).sort((a, b) => b.count - a.count),
    trends: Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date)),
    criteria: Object.values(criteriaMap).sort((a, b) => b.missed - a.missed)
  };
}

app.get("/", (req, res) => {
  res.send("QA Form Quiz Server is running.");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "QA API is running",
    allowedOrigins,
    time: new Date().toISOString()
  });
});

app.get("/api/app-data", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const customerServiceQaRows = await getSheetValues(sheets, spreadsheetId, "'QA Form'!A1:I");
    const customerServiceRubricRows = await getSheetValues(sheets, spreadsheetId, "'Rubric (Calibration)'!A1:I");
    const flightsQaRows = await getSheetValues(sheets, spreadsheetId, "'QA Form - Flights'!A1:I");
    const flightsRubricRows = await getSheetValues(sheets, spreadsheetId, "'Rubric (Calibration) - Flights'!A1:I");

    const customerServiceCriteria = buildCriteriaFromRows(
      "customerService",
      customerServiceQaRows,
      customerServiceRubricRows
    );

    const flightsCriteria = buildCriteriaFromRows(
      "flights",
      flightsQaRows,
      flightsRubricRows
    );

    res.json({
      ok: true,
      appName: "QA Form Quiz Coaching Tool",
      passingScore: PASSING_SCORE,
      scheduleReminder: "QA coaching schedule loaded.",
      todayTeams: [],
      teams: [
        { team: "Telus", day: "Tuesday", reminder: "Telus QA coaching focus." },
        { team: "TEP", day: "Tuesday", reminder: "TEP QA coaching focus." },
        { team: "Buwelo-C", day: "Wednesday", reminder: "Buwelo customer service QA coaching focus." },
        { team: "Buwelo-G", day: "Wednesday", reminder: "Buwelo groups QA coaching focus." },
        { team: "WNS", day: "Thursday", reminder: "WNS QA coaching focus." },
        { team: "Concentrix", day: "Friday", reminder: "Concentrix QA coaching focus." }
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
      message: error.message || "Failed to load app data",
      details: String(error),
      criteriaSets: {
        customerService: [],
        flights: []
      }
    });
  }
});

app.post("/api/calculate", async (req, res) => {
  try {
    const { criteria = [], ratings = {} } = req.body;
    const score = calculateScore(criteria, ratings);

    res.json({
      ok: true,
      score
    });
  } catch (error) {
    console.error("CALCULATE ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to calculate score."
    });
  }
});

app.post("/api/submit", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const {
      qaDate,
      callCenter,
      agentName,
      evaluator,
      qaType,
      score,
      coachingSummary,
      officialFinal
    } = req.body;

    const finalScore = score || {};
    const timestamp = new Date().toISOString();

    await appendSheetValues(sheets, spreadsheetId, "'Responses'!A:Z", [
      [
        timestamp,
        qaDate || "",
        normalizeClientName(callCenter || ""),
        agentName || "",
        evaluator || "",
        qaType || "",
        finalScore.earned || 0,
        finalScore.possible || 0,
        finalScore.finalPercent || 0,
        finalScore.result || "",
        officialFinal ? "Yes" : "No",
        coachingSummary || "",
        JSON.stringify(finalScore.details || [])
      ]
    ]);

    res.json({
      ok: true,
      message: "QA response saved successfully.",
      saved: {
        timestamp,
        qaDate,
        callCenter,
        agentName,
        evaluator,
        qaType,
        finalPercent: finalScore.finalPercent,
        result: finalScore.result
      }
    });
  } catch (error) {
    console.error("SUBMIT ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to submit QA response."
    });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const responseRows = await getSheetValues(sheets, spreadsheetId, "'Responses'!A1:AZ");
    const rows = rowsToObjects(responseRows);
    const analytics = buildAnalytics(rows, req.query);

    res.json({
      ok: true,
      analytics
    });
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load analytics."
    });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const responseRows = await getSheetValues(sheets, spreadsheetId, "'Responses'!A1:AZ");
    const rows = rowsToObjects(responseRows);
    const analytics = buildAnalytics(rows, req.query);

    res.json({
      ok: true,
      dashboard: analytics,
      analytics
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load dashboard."
    });
  }
});

app.get("/api/past-submissions", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const responseRows = await getSheetValues(sheets, spreadsheetId, "'Responses'!A1:AZ");
    const rows = rowsToObjects(responseRows);
    const analytics = buildAnalytics(rows, req.query);

    res.json({
      ok: true,
      submissions: analytics.rows
    });
  } catch (error) {
    console.error("PAST SUBMISSIONS ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to load past submissions."
    });
  }
});

app.get("/api/export-csv", async (req, res) => {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const responseRows = await getSheetValues(sheets, spreadsheetId, "'Responses'!A1:AZ");
    const rows = rowsToObjects(responseRows);
    const analytics = buildAnalytics(rows, req.query);

    const headers = [
      "Timestamp",
      "QA Date",
      "Client",
      "Agent Name",
      "Evaluator",
      "QA Type",
      "Final %",
      "Result"
    ];

    const csvRows = [
      headers.join(","),
      ...analytics.rows.map((row) =>
        [
          row.timestamp,
          row.qaDate,
          row.callCenter,
          row.agentName,
          row.evaluator,
          row.qaType,
          row.finalPercent,
          row.result
        ]
          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=qa-scores.csv");
    res.send(csvRows.join("\n"));
  } catch (error) {
    console.error("CSV EXPORT ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to export CSV."
    });
  }
});

app.post("/api/ai-coaching", async (req, res) => {
  try {
    const { score } = req.body;

    const finalPercent = score?.finalPercent || 0;

    let message = "Review the QA details and coach the agent on missed opportunities.";

    if (finalPercent >= 90) {
      message = "Great QA result. Reinforce the positive behaviors and keep consistency.";
    } else if (finalPercent >= 70) {
      message = "Good start, but the agent needs coaching on partial and zero-score items.";
    } else {
      message = "Strong coaching needed. Focus on the critical missed behaviors first.";
    }

    res.json({
      ok: true,
      coaching: message
    });
  } catch (error) {
    console.error("AI COACHING ERROR:", error);

    res.status(500).json({
      ok: false,
      message: error.message || "Failed to generate coaching."
    });
  }
});

app.listen(PORT, () => {
  console.log(`QA Form React API running on port ${PORT}`);
});