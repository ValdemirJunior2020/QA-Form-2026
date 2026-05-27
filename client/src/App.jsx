// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\client\src\App.jsx

import React, { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  Brain,
  Download,
  FileSpreadsheet,
  Gauge,
  Moon,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Sun
} from "lucide-react";
import { api } from "./api";

const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1bkVWrWhfsvSXWLwWZ1E7fd7D4ZtSewRt2T942b6NUkY/edit?gid=139809877#gid=139809877";

const FINAL_REVIEWER_ROLE = "QA Leader / Final Reviewer";

const LOADING_GIF_URL =
  "https://media1.tenor.com/m/IavKWJp8FJEAAAAC/meme-coffee.gif";

const FUNNY_QA_LOADING_MESSAGES = [
  "Brewing the QA scores...",
  "Checking who forgot empathy today...",
  "Counting Full, Partial, and Uh No moments...",
  "Finding coaching opportunities before the coffee gets cold...",
  "Calculating if the agent survived the rubric...",
  "Looking for missing documentation notes...",
  "Asking the matrix for wisdom...",
  "Preparing manager-friendly QA truth...",
  "Waking up the Google Sheet...",
  "Loading the rubric like it owes us answers...",
  "Making sure N/A counts as full credit...",
  "Double-checking the QA tea before we spill it...",
  "Looking for coaching gold in the call...",
  "Please hold while the QA coffee kicks in..."
];

const defaultAppData = {
  appName: "",
  passingScore: 90,
  scheduleReminder: "",
  todayTeams: [],
  teams: [],
  criteriaSets: {
    customerService: [],
    flights: []
  }
};

const ratingMessages = {
  Zero: {
    title: "Uh No! 🚨",
    message: "That one landed like a dropped headset. Coach it and keep moving!",
    tone: "zero"
  },
  Partial: {
    title: "Well… at least they got something 😅",
    message: "Partial credit is still credit. Let’s clean up the missing pieces.",
    tone: "partial"
  },
  Full: {
    title: "Uhuuulll! That’s what I’m talking about! 🎉",
    message: "Full points! Green festive flakes everywhere!",
    tone: "full"
  },
  "N/A": {
    title: "N/A counts as full credit ✅",
    message: "Not applicable, but still full points for this criterion.",
    tone: "full"
  }
};

function emptyAnswer() {
  return {
    rating: "",
    notes: "",
    subChecks: {},
    subCheckNotes: {}
  };
}

function escapeText(value) {
  return String(value ?? "");
}

function calculateEarned(criterion, answer) {
  const rating = answer?.rating || "";

  if (rating === "Full" || rating === "N/A") {
    return Number(criterion.maxPoints || 0);
  }

  if (rating === "Partial") {
    return Number(criterion.maxPoints || 0) / 2;
  }

  return 0;
}

function buildQaAnalystPrompt({ metadata, qaType, result }) {
  const weakItems = (result.details || []).filter(
    (item) => item.rating === "Partial" || item.rating === "Zero"
  );

  const strongItems = (result.details || []).filter(
    (item) => item.rating === "Full" || item.rating === "N/A"
  );

  const missedText = weakItems.length
    ? weakItems
        .map((item, index) => {
          return `${index + 1}. ${item.criterion}
Rating: ${item.rating}
Points: ${item.earned}/${item.maxPoints}
Evaluator Notes: ${item.notes || "No notes added."}
Missed Sub-Checks: ${
            item.missedSubChecks && item.missedSubChecks.length
              ? item.missedSubChecks.join("; ")
              : "None listed"
          }`;
        })
        .join("\n\n")
    : "No partial or zero items. The agent passed all reviewed criteria.";

  const strengthsText = strongItems.length
    ? strongItems
        .slice(0, 4)
        .map((item, index) => {
          return `${index + 1}. ${item.criterion} — ${item.earned}/${item.maxPoints} points`;
        })
        .join("\n")
    : "No full-credit strengths listed.";

  return `
You are a senior Quality Assurance Analyst coaching HotelPlanner call center agents.

Write coaching that is useful for a live coaching session.
Do not repeat rubric definitions.
Do not copy and paste the Google Sheet wording.
Do not shame the agent.
Do not invent facts.
Focus only on the most important coaching needed.
Use practical call center language.
Keep it direct, professional, and easy for a leader to read out loud.

Agent: ${metadata.agentName || "Unknown Agent"}
Evaluator: ${metadata.evaluator || "Unknown Evaluator"}
Evaluator Role: ${metadata.evaluatorRole || "Unknown Role"}
Call Center: ${metadata.callCenter || "Unknown Call Center"}
QA Type: ${qaType === "flights" ? "FLYus / Flights QA" : "Customer Service QA"}
Evaluation Mode: ${metadata.evaluationMode || "Internal QA"}
Official Final Score: ${metadata.isOfficialFinal ? "YES" : "NO"}
Final Score: ${result.percent}%
Final Result: ${result.result}
Passing Score: ${result.passingScore}%

Overall QA Summary:
${result.summary}

Strengths:
${strengthsText}

Missed or Partial Criteria:
${missedText}

Return coaching in this exact format:

Key Coaching Needed:
Write 2 to 4 sentences explaining the most important issue.

Main Coaching Opportunities:
Use bullets. Focus on what the agent missed, not definitions.

What the Agent Should Do Next Call:
Use bullets with specific behaviors.

Leader Coaching Script:
Write a short script the leader can say directly to the agent.

Follow-Up:
Give one follow-up action for the leader.
`.trim();
}

function calculateLiveScoreStats(criteria = [], answers = {}, fallbackResult = null) {
  let earnedSoFar = 0;
  let possibleSoFar = 0;
  let totalPossible = 0;
  let completedCriteria = 0;

  const rows = criteria.map((criterion) => {
    const answer = answers[criterion.id] || emptyAnswer();
    const rating = answer.rating || "";
    const maxPoints = Number(criterion.maxPoints || 0);
    const earned = calculateEarned(criterion, answer);
    const isScored = Boolean(rating);

    totalPossible += maxPoints;

    if (isScored) {
      completedCriteria += 1;
      earnedSoFar += earned;
      possibleSoFar += maxPoints;
    }

    return {
      id: criterion.id,
      number: criterion.number,
      criterion: criterion.criterion,
      rating: rating || "Not scored",
      earned,
      maxPoints,
      isScored
    };
  });

  if (!criteria.length && fallbackResult) {
    const score = Number(fallbackResult.score || 0);
    const maxScore = Number(fallbackResult.maxScore || 0);
    const percent = Number(fallbackResult.percent || 0);
    const details = Array.isArray(fallbackResult.details)
      ? fallbackResult.details
      : [];

    return {
      earnedSoFar: score,
      possibleSoFar: maxScore,
      totalPossible: maxScore,
      completedCriteria: details.length,
      totalCriteria: details.length,
      currentPercent: percent,
      scoredOnlyPercent: percent,
      rows: details.map((detail) => ({
        id: detail.id,
        number: detail.number,
        criterion: detail.criterion,
        rating: detail.rating || "Not scored",
        earned: detail.earned || 0,
        maxPoints: detail.maxPoints || 0,
        isScored: Boolean(detail.rating)
      }))
    };
  }

  const currentPercent =
    totalPossible > 0 ? Math.round((earnedSoFar / totalPossible) * 100) : 0;

  const scoredOnlyPercent =
    possibleSoFar > 0 ? Math.round((earnedSoFar / possibleSoFar) * 100) : 0;

  return {
    earnedSoFar: Math.round(earnedSoFar * 100) / 100,
    possibleSoFar: Math.round(possibleSoFar * 100) / 100,
    totalPossible: Math.round(totalPossible * 100) / 100,
    completedCriteria,
    totalCriteria: criteria.length,
    currentPercent,
    scoredOnlyPercent,
    rows
  };
}

function App() {
  const [appData, setAppData] = useState(defaultAppData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [theme, setTheme] = useState("light");
  const [panel, setPanel] = useState("start");
  const [qaType, setQaType] = useState("customerService");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [toast, setToast] = useState("");
  const [ratingPopup, setRatingPopup] = useState(null);
  const [coachingPopup, setCoachingPopup] = useState("");

  const [metadata, setMetadata] = useState({
    evaluationMode: "Internal QA",
    evaluator: "",
    evaluatorRole: "Evaluator",
    isOfficialFinal: false,
    agentName: "",
    callCenter: "",
    callId: "",
    itineraryNumber: "",
    qaDate: new Date().toISOString().slice(0, 10)
  });

  const [latestResult, setLatestResult] = useState(null);
  const [latestAICoaching, setLatestAICoaching] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState({
    saving: false,
    saved: false,
    error: ""
  });
  const [pastRows, setPastRows] = useState([]);

  const [dashboardInput, setDashboardInput] = useState({
    callCenter: "Telus",
    password: "",
    officialOnly: true
  });

  const [dashboardState, setDashboardState] = useState({
    loading: false,
    access: null,
    dashboard: null
  });

  const criteria = useMemo(() => {
    if (qaType === "flights") return appData.criteriaSets.flights || [];
    return appData.criteriaSets.customerService || [];
  }, [appData, qaType]);

  const currentItem = criteria[currentIndex];
  const liveResult = calculateLocalResult();
  const liveStats = calculateLiveScoreStats(criteria, answers, liveResult);

  useEffect(() => {
    document.body.className = theme === "