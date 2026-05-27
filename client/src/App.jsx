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

function isReservationVerificationCriterion(criterion) {
  const text = String(criterion || "").toLowerCase();

  return (
    text.includes("verification reservation search effort") ||
    text.includes("reservation search effort") ||
    text.includes("reservation search") ||
    text.includes("probing questions")
  );
}

function coachingActionForCriterion(criterion) {
  const text = String(criterion || "").toLowerCase();

  if (text.includes("agent is ready") || text.includes("receive call")) {
    return "Use the required opening clearly, sound ready, and set a professional tone from the first sentence.";
  }

  if (
    text.includes("verification") ||
    text.includes("reservation search") ||
    text.includes("probing")
  ) {
    return "Slow down before saying the reservation cannot be found. Ask for the guest name, itinerary number, hotel name, dates, phone number, and email when needed.";
  }

  if (
    text.includes("acknowledges") ||
    text.includes("empathy") ||
    text.includes("reiteration")
  ) {
    return "Acknowledge the guest’s concern before solving. Restate the issue so the guest knows the agent understood the request.";
  }

  if (text.includes("matrix compliance")) {
    return "Follow the correct Matrix path. Do not skip required tools, escalation steps, policy checks, or process requirements.";
  }

  if (text.includes("ownership")) {
    return "Own the issue. Explain what can be done, what cannot be done, and guide the guest to the next step.";
  }

  if (text.includes("efficiency")) {
    return "Set expectations clearly, manage hold time correctly, and keep the guest updated so there is no silence or confusion.";
  }

  if (text.includes("documentation")) {
    return "Document the reason for the contact, action taken, outcome, and next step. Notes must support the QA decision.";
  }

  if (text.includes("recap") || text.includes("next steps")) {
    return "Before ending, recap what happened and confirm the next step so the guest knows exactly what to expect.";
  }

  if (text.includes("telephone") || text.includes("communication")) {
    return "Use confident call control, active listening, and professional wording. Avoid sounding rushed, unsure, or dismissive.";
  }

  return "Review the missed behavior and give the agent one clear example of what to do on the next call.";
}

function buildSmartQaCoaching({ metadata, qaType, result }) {
  const missedItems = (result.details || []).filter(
    (item) => item.rating === "Partial" || item.rating === "Zero"
  );

  const topMissed = missedItems.slice(0, 4);
  const agentName = metadata.agentName || "the agent";
  const evaluator = metadata.evaluator || "the evaluator";
  const callCenter = metadata.callCenter || "the call center";
  const qaLabel = qaType === "flights" ? "FLYus / Flights QA" : "Customer Service QA";

  if (!missedItems.length && Number(result.percent || 0) >= 90) {
    return `Key Coaching Needed:
${agentName} passed this QA review. Reinforce consistency, professional tone, process accuracy, and complete documentation.

QA Details:
Evaluator: ${evaluator}
Call Center: ${callCenter}
QA Type: ${qaLabel}
Final Score: ${result.percent}%
Result: ${result.result}

Main Coaching Opportunities:
• No major failed or partial criteria were identified.
• Keep monitoring for consistency on future calls.
• Reinforce the behaviors that helped the agent pass.

What the Agent Should Do Next Call:
• Continue following the QA process.
• Keep documentation complete and aligned with the action taken.
• Maintain professional tone, ownership, and clear next steps.

Leader Coaching Script:
${agentName}, this was a strong QA result. Keep doing what worked here, especially staying professional, following the process, and documenting clearly.

Follow-Up:
Review another call to confirm the same behaviors are consistent.`;
  }

  const opportunityLines = topMissed
    .map((item) => {
      return `• ${item.criterion} — ${item.rating} (${item.earned}/${item.maxPoints} pts): ${coachingActionForCriterion(item.criterion)}`;
    })
    .join("\n");

  const nextCallLines = topMissed
    .map((item) => `• ${coachingActionForCriterion(item.criterion)}`)
    .join("\n");

  const biggestIssue = topMissed[0]
    ? coachingActionForCriterion(topMissed[0].criterion)
    : "Correct the missed QA behaviors on the next call.";

  return `Key Coaching Needed:
${agentName} needs focused coaching on the behaviors that lowered this QA score. The biggest coaching focus is this: ${biggestIssue}

QA Details:
Evaluator: ${evaluator}
Call Center: ${callCenter}
QA Type: ${qaLabel}
Final Score: ${result.percent}%
Result: ${result.result}

Main Coaching Opportunities:
${opportunityLines}

What the Agent Should Do Next Call:
${nextCallLines}

Leader Coaching Script:
${agentName}, I want to focus on the behaviors that lowered this QA. On the next call, slow down, verify what needs to be verified, acknowledge the guest clearly, follow the correct process, and document what happened. The goal is not only to improve the score, but to make sure the guest is handled correctly and the next person can understand the action from the notes.

Follow-Up:
The leader should review the next call and confirm whether these same missed behaviors were corrected.`;
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
        .slice(0, 5)
        .map((item, index) => {
          const missedSubChecks =
            item.missedSubChecks && item.missedSubChecks.length
              ? item.missedSubChecks.slice(0, 5).join("; ")
              : "None listed";

          return `${index + 1}. ${item.criterion}
Rating: ${item.rating}
Points: ${item.earned}/${item.maxPoints}
Evaluator Notes: ${item.notes || "No notes added."}
Missed Sub-Checks: ${missedSubChecks}`;
        })
        .join("\n\n")
    : "No partial or zero items. The agent passed all reviewed criteria.";

  const strengthsText = strongItems.length
    ? strongItems
        .slice(0, 4)
        .map(
          (item, index) =>
            `${index + 1}. ${item.criterion} — ${item.earned}/${item.maxPoints} points`
        )
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
    if (qaType === "flights") {
      return appData.criteriaSets.flights || [];
    }

    return appData.criteriaSets.customerService || [];
  }, [appData, qaType]);

  const currentItem = criteria[currentIndex];
  const liveResult = calculateLocalResult();
  const liveStats = calculateLiveScoreStats(criteria, answers, liveResult);

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  useEffect(() => {
    loadApp();
  }, []);

  useEffect(() => {
    if (!metadata.callCenter && appData.teams?.length) {
      setMetadata((prev) => ({
        ...prev,
        callCenter: appData.teams[0].team
      }));
    }
  }, [appData.teams, metadata.callCenter]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  async function loadApp() {
    setLoading(true);
    setError("");

    try {
      const data = await api.getAppData();
      setAppData(data);

      const saved = localStorage.getItem("qaFormReactProgress");

      if (saved) {
        const parsed = JSON.parse(saved);

        setQaType(parsed.qaType || "customerService");
        setCurrentIndex(parsed.currentIndex || 0);
        setAnswers(parsed.answers || {});

        setMetadata((prev) => {
          const restored = {
            ...prev,
            ...(parsed.metadata || {})
          };

          if (
            restored.evaluationMode === "Calibration / Practice" ||
            restored.evaluationMode === "Calibration Practice"
          ) {
            restored.evaluationMode = "Internal QA";
            restored.isOfficialFinal = false;
          }

          if (restored.evaluatorRole !== FINAL_REVIEWER_ROLE) {
            restored.evaluationMode = "Internal QA";
            restored.isOfficialFinal = false;
          }

          return restored;
        });
      }
    } catch (err) {
      setError(err.message || "Could not load QA app.");
    } finally {
      setLoading(false);
    }
  }

  function saveProgress(
    nextAnswers = answers,
    nextMetadata = metadata,
    nextIndex = currentIndex,
    nextQaType = qaType
  ) {
    localStorage.setItem(
      "qaFormReactProgress",
      JSON.stringify({
        qaType: nextQaType,
        currentIndex: nextIndex,
        answers: nextAnswers,
        metadata: nextMetadata
      })
    );
  }

  function updateMetadata(name, value) {
    const next = {
      ...metadata,
      [name]: value
    };

    if (name === "evaluatorRole") {
      if (value === FINAL_REVIEWER_ROLE) {
        next.evaluationMode = "Official QA";
        next.isOfficialFinal = true;
      } else {
        next.evaluationMode = "Internal QA";
        next.isOfficialFinal = false;
      }
    }

    if (name === "evaluationMode") {
      if (value === "Official QA" && metadata.evaluatorRole !== FINAL_REVIEWER_ROLE) {
        showToast("Only QA Leader / Final Reviewer can submit Official QA.");
        next.evaluationMode = "Internal QA";
        next.isOfficialFinal = false;
      }

      if (value === "Internal QA") {
        next.isOfficialFinal = false;
      }

      if (value === "Official QA" && metadata.evaluatorRole === FINAL_REVIEWER_ROLE) {
        next.isOfficialFinal = true;
      }
    }

    if (name === "isOfficialFinal") {
      if (value && metadata.evaluatorRole !== FINAL_REVIEWER_ROLE) {
        showToast("Only QA Leader / Final Reviewer can mark Official Final Score.");
        next.isOfficialFinal = false;
        next.evaluationMode = "Internal QA";
      } else if (value && metadata.evaluatorRole === FINAL_REVIEWER_ROLE) {
        next.isOfficialFinal = true;
        next.evaluationMode = "Official QA";
      } else {
        next.isOfficialFinal = false;
        next.evaluationMode = "Internal QA";
      }
    }

    setMetadata(next);
    saveProgress(answers, next);
  }

  function answerFor(id) {
    return answers[id] || emptyAnswer();
  }

  function updateAnswer(itemId, patch) {
    const current = answerFor(itemId);
    const nextAnswers = {
      ...answers,
      [itemId]: {
        ...current,
        ...patch
      }
    };

    setAnswers(nextAnswers);
    saveProgress(nextAnswers);

    if (patch.rating) {
      showRatingPopup(patch.rating);
    }
  }

  function showRatingPopup(rating) {
    const data = ratingMessages[rating];

    if (!data) return;

    setRatingPopup(data);

    if (rating === "Full" || rating === "N/A") {
      fireGreenFlakes();
    }

    window.setTimeout(() => setRatingPopup(null), 2100);
  }

  function fireGreenFlakes() {
    const end = Date.now() + 1200;

    const interval = window.setInterval(() => {
      if (Date.now() > end) {
        window.clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 35,
        spread: 75,
        startVelocity: 45,
        origin: {
          x: Math.random(),
          y: Math.random() * 0.35
        },
        colors: ["#10b981", "#22c55e", "#84cc16", "#bbf7d0", "#facc15"]
      });
    }, 160);
  }

  function calculateLocalResult() {
    let score = 0;
    let maxScore = 0;
    let criticalGateFailed = false;
    let forceFinalZero = false;
    let forceFinalZeroReason = "";
    const details = [];

    criteria.forEach((item) => {
      const answer = answerFor(item.id);
      const rating = answer.rating || "";
      const notes = String(answer.notes || "").trim();
      let earned = 0;

      if (rating === "Full" || rating === "N/A") {
        earned = Number(item.maxPoints || 0);
      } else if (rating === "Partial") {
        earned = Number(item.maxPoints || 0) / 2;
      }

      const criterionName = String(item.criterion || "").toLowerCase();

      if (
        criterionName.includes("documentation quality") &&
        rating &&
        rating !== "N/A" &&
        !notes
      ) {
        forceFinalZero = true;
        forceFinalZeroReason =
          "Documentation Quality had no notes/evidence. This is a complete QA fail, so the final score is forced to 0%.";
      }

      if (item.isCriticalGate && rating === "Zero") {
        criticalGateFailed = true;
      }

      score += earned;
      maxScore += Number(item.maxPoints || 0);

      const missedSubChecks = [];
      const completedSubChecks = [];

      if (isReservationVerificationCriterion(item.criterion)) {
        (item.subChecks || []).forEach((check) => {
          const selected = answer.subChecks?.[check.id] || "";

          if (selected === "Yes" || selected === "N/A") {
            completedSubChecks.push(check.label);
          } else {
            missedSubChecks.push(check.label);
          }
        });
      }

      let feedback = "";

      if (rating === "Full" || rating === "N/A") {
        feedback = item.fullReason || "Meets full QA expectations.";
      } else if (rating === "Partial") {
        feedback =
          item.partialReason ||
          "Partial credit. Some expected behaviors were missed.";
      } else {
        feedback = item.zeroReason || "No credit. Required QA behavior was missed.";
      }

      if (
        criterionName.includes("documentation quality") &&
        rating &&
        rating !== "N/A" &&
        !notes
      ) {
        feedback =
          "Complete QA fail: Documentation Quality requires notes/evidence. No notes were added, so the final QA score is forced to 0%.";
      }

      if (missedSubChecks.length > 0) {
        feedback +=
          " Missed or unclear sub-checks: " + missedSubChecks.join("; ") + ".";
      }

      details.push({
        id: item.id,
        number: item.number,
        criterion: item.criterion,
        maxPoints: Number(item.maxPoints || 0),
        earned,
        rating,
        notes,
        subChecks: answer.subChecks || {},
        subCheckNotes: answer.subCheckNotes || {},
        completedSubChecks,
        missedSubChecks,
        scoringTreatment: item.scoringTreatment,
        isCriticalGate: item.isCriticalGate,
        feedback
      });
    });

    let percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    if (forceFinalZero) {
      score = 0;
      percent = 0;
      criticalGateFailed = true;
    }

    let result =
      percent >= Number(appData.passingScore || 90)
        ? "PASSED"
        : "NEEDS IMPROVEMENT";

    if (criticalGateFailed || forceFinalZero) {
      result = "NEEDS IMPROVEMENT";
    }

    const weakItems = details
      .filter((item) => item.rating === "Partial" || item.rating === "Zero")
      .map((item) => item.criterion);

    let summary =
      result === "PASSED"
        ? "Agent passed the QA coaching review."
        : "Agent needs coaching. Focus on missed QA criteria, documentation, process compliance, and clear next steps.";

    if (forceFinalZero) {
      summary += " " + forceFinalZeroReason;
    } else if (criticalGateFailed) {
      summary += " A critical gate item was scored as zero.";
    }

    if (weakItems.length > 0) {
      summary += " Coaching focus: " + weakItems.join("; ") + ".";
    }

    return {
      score: Math.round(score * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      percent,
      result,
      passingScore: Number(appData.passingScore || 90),
      criticalGateFailed,
      forceFinalZero,
      forceFinalZeroReason,
      summary,
      details
    };
  }

  function startQuiz() {
    if (!metadata.evaluator.trim() || !metadata.agentName.trim()) {
      showToast("Please enter evaluator and agent name.");
      return;
    }

    if (!criteria.length) {
      showToast("No criteria found for the selected QA type.");
      return;
    }

    setCurrentIndex(0);
    saveProgress(answers, metadata, 0);
    setAutoSaveStatus({
      saving: false,
      saved: false,
      error: ""
    });
    setLatestAICoaching("");
    setCoachingPopup("");
    setPanel("quiz");
  }

  function nextCriterion() {
    if (!currentItem) return;

    const answer = answerFor(currentItem.id);

    if (!answer.rating) {
      showToast("Please select Full, Partial, Zero, or N/A.");
      return;
    }

    if (currentIndex < criteria.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveProgress(answers, metadata, nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    finishQA();
  }

  function previousCriterion() {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      saveProgress(answers, metadata, nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setPanel("start");
  }

  async function finishQA() {
    const result = calculateLocalResult();
    const smartCoaching = buildSmartQaCoaching({ metadata, qaType, result });

    setLatestResult(result);
    setLatestAICoaching("");
    setCoachingPopup("");
    setPanel("result");

    setAutoSaveStatus({
      saving: true,
      saved: false,
      error: ""
    });

    setAiLoading(true);
    showToast("Finishing QA, preparing coaching, and saving automatically...");

    const coachingPrompt = buildQaAnalystPrompt({
      metadata,
      qaType,
      result
    });

    let coachingText = smartCoaching;

    try {
      await api.aiCoaching({
        metadata: {
          ...metadata,
          qaType
        },
        result,
        coachingPrompt
      });
    } catch (err) {
      // The app uses the local smart coaching to avoid ugly repeated rubric text.
    } finally {
      setLatestAICoaching(coachingText);
      setCoachingPopup(coachingText);
      setAiLoading(false);
    }

    try {
      await api.submit({
        metadata: {
          ...metadata,
          qaType
        },
        answers,
        result,
        aiCoaching: coachingText
      });

      localStorage.removeItem("qaFormReactProgress");

      setAutoSaveStatus({
        saving: false,
        saved: true,
        error: ""
      });

      showToast("✅ QA saved automatically with coaching.");
    } catch (err) {
      setAutoSaveStatus({
        saving: false,
        saved: false,
        error: err.message || "Could not save QA automatically."
      });

      showToast(err.message || "Could not save QA automatically.");
    }
  }

  async function generateAICoaching() {
    if (!latestResult) {
      showToast("Finish the QA first.");
      return;
    }

    setAiLoading(true);
    setLatestAICoaching("");
    setCoachingPopup("");

    const coachingText = buildSmartQaCoaching({
      metadata,
      qaType,
      result: latestResult
    });

    try {
      await api.aiCoaching({
        metadata: {
          ...metadata,
          qaType
        },
        result: latestResult,
        coachingPrompt: buildQaAnalystPrompt({
          metadata,
          qaType,
          result: latestResult
        })
      });
    } catch (err) {
      // The app uses the local smart coaching to avoid ugly repeated rubric text.
    } finally {
      setLatestAICoaching(coachingText);
      setCoachingPopup(coachingText);
      setAiLoading(false);
      showToast("QA coaching generated.");
    }
  }

  async function saveSubmission() {
    if (!latestResult) return;

    if (
      metadata.evaluationMode === "Official QA" &&
      metadata.evaluatorRole !== FINAL_REVIEWER_ROLE
    ) {
      showToast("Only QA Leader / Final Reviewer can submit Official QA.");
      return;
    }

    if (metadata.isOfficialFinal && metadata.evaluatorRole !== FINAL_REVIEWER_ROLE) {
      showToast("Only QA Leader / Final Reviewer can submit the final score.");
      return;
    }

    setSaving(true);

    try {
      await api.submit({
        metadata: {
          ...metadata,
          qaType
        },
        answers,
        result: latestResult,
        aiCoaching: latestAICoaching
      });

      localStorage.removeItem("qaFormReactProgress");

      setAutoSaveStatus({
        saving: false,
        saved: true,
        error: ""
      });

      showToast("✅ QA response saved to Google Sheet.");
    } catch (err) {
      setAutoSaveStatus({
        saving: false,
        saved: false,
        error: err.message || "Could not save QA."
      });

      showToast(err.message || "Could not save QA.");
    } finally {
      setSaving(false);
    }
  }

  function copyCoachingNotes() {
    if (!latestResult) return;

    let text = "";
    text += "QA Coaching Summary\n";
    text += `QA Type: ${
      qaType === "flights" ? "FLYus / Flights QA" : "Customer Service QA"
    }\n`;
    text += `Evaluation Mode: ${metadata.evaluationMode}\n`;
    text += `Official Final Score: ${metadata.isOfficialFinal ? "YES" : "NO"}\n`;
    text += `Agent: ${metadata.agentName}\n`;
    text += `Evaluator: ${metadata.evaluator}\n`;
    text += `Evaluator Role: ${metadata.evaluatorRole}\n`;
    text += `Call Center: ${metadata.callCenter}\n`;
    text += `Score: ${latestResult.percent}% - ${latestResult.result}\n\n`;
    text += latestResult.summary + "\n\n";

    if (latestAICoaching) {
      text += "QA Analyst Coaching:\n" + latestAICoaching + "\n\n";
    }

    latestResult.details.forEach((detail) => {
      text += `${detail.number}. ${detail.criterion}\n`;
      text += `Rating: ${detail.rating || "Not selected"}\n`;
      text += `Points: ${detail.earned} / ${detail.maxPoints}\n`;
      text += `Feedback: ${detail.feedback}\n`;
      text += `Notes: ${detail.notes || "No notes added."}\n\n`;
    });

    navigator.clipboard.writeText(text);
    showToast("Coaching notes copied.");
  }

  async function loadPastSubmissions() {
    setPanel("past");

    try {
      const data = await api.pastSubmissions({
        limit: 30
      });

      setPastRows(data.rows || data.submissions || []);
    } catch (err) {
      showToast(err.message || "Could not load past submissions.");
    }
  }

  async function loadDashboard() {
    setDashboardState({
      loading: true,
      access: null,
      dashboard: null
    });

    try {
      const data = await api.dashboard(dashboardInput);

      setDashboardState({
        loading: false,
        access: data.access || null,
        dashboard: data.dashboard || data.analytics || null
      });
    } catch (err) {
      showToast(err.message || "Could not load dashboard.");
      setDashboardState({
        loading: false,
        access: null,
        dashboard: null
      });
    }
  }

  function changeQaType(nextType) {
    setQaType(nextType);
    saveProgress(answers, metadata, currentIndex, nextType);
  }

  if (loading) {
    return <FunnyLoadingScreen title="Loading QA Form..." />;
  }

  if (error) {
    return (
      <FunnyLoadingScreen
        title="Something needs attention"
        error={error}
        onRetry={loadApp}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">HotelPlanner QA Coaching</p>
          <h1>QA Form Quiz Coaching Tool</h1>
          <p className="subtitle">
            React + Netlify frontend, Google Apps Script backend, Google Sheets storage, and coaching notes.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setPanel("start")}>
              <ShieldCheck size={18} /> Start QA
            </button>

            <button className="manager-btn" onClick={() => setPanel("dashboard")}>
              <Gauge size={18} /> Manager Dashboard
            </button>

            <a
              className="sheet-btn"
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
            >
              <FileSpreadsheet size={18} /> Open Google Sheet
            </a>
          </div>
        </div>

        <div className="schedule-card">
          <p className="small-title">Schedule Reminder</p>
          <p>{appData.scheduleReminder || "Weekly coaching schedule loaded."}</p>
          <p>
            Tuesday: Telus / TEP
            <br />
            Wednesday: Buwelo-C / Buwelo-G
            <br />
            Thursday: WNS
            <br />
            Friday: Concentrix
          </p>

          <button
            className="ghost-white-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            Toggle Theme
          </button>
        </div>
      </header>

      <main className="container">
        {panel === "start" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow dark-text">Evaluation Details</p>
                <h2>Start QA Coaching Session</h2>
              </div>

              <button
                className="ghost-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                Dark / Light
              </button>
            </div>

            <LiveScoringBanner
              metadata={metadata}
              liveStats={liveStats}
              currentIndex={currentIndex}
              totalCriteria={criteria.length}
              currentItem={currentItem}
            />

            <div className="form-grid">
              <label>
                QA Type
                <select value={qaType} onChange={(e) => changeQaType(e.target.value)}>
                  <option value="customerService">Customer Service QA</option>
                  <option value="flights">FLYus / Flights QA</option>
                </select>
              </label>

              <label>
                Evaluation Mode
                <select
                  value={metadata.evaluationMode}
                  onChange={(e) => updateMetadata("evaluationMode", e.target.value)}
                >
                  <option value="Internal QA">
                    Internal QA = helpers/leaders/coaching evaluations
                  </option>

                  {metadata.evaluatorRole === FINAL_REVIEWER_ROLE && (
                    <option value="Official QA">Official QA = final counted QA</option>
                  )}
                </select>
              </label>

              <label>
                Evaluator / Coach
                <input
                  value={metadata.evaluator}
                  onChange={(e) => updateMetadata("evaluator", e.target.value)}
                  placeholder="Coach name"
                />
              </label>

              <label>
                Evaluator Role
                <select
                  value={metadata.evaluatorRole}
                  onChange={(e) => updateMetadata("evaluatorRole", e.target.value)}
                >
                  <option value="Evaluator">Evaluator</option>
                  <option value="Helper / Coach">Helper / Coach</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="QA Leader / Final Reviewer">
                    QA Leader / Final Reviewer
                  </option>
                </select>
              </label>

              <label>
                Agent Name
                <input
                  value={metadata.agentName}
                  onChange={(e) => updateMetadata("agentName", e.target.value)}
                  placeholder="Agent name"
                />
              </label>

              <label>
                Call Center
                <select
                  value={metadata.callCenter}
                  onChange={(e) => updateMetadata("callCenter", e.target.value)}
                >
                  {(appData.teams || []).map((team) => (
                    <option key={team.team} value={team.team}>
                      {team.team}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Call ID
                <input
                  value={metadata.callId}
                  onChange={(e) => updateMetadata("callId", e.target.value)}
                  placeholder="Call ID"
                />
              </label>

              <label>
                Itinerary Number
                <input
                  value={metadata.itineraryNumber}
                  onChange={(e) => updateMetadata("itineraryNumber", e.target.value)}
                  placeholder="Example: H12345678"
                />
              </label>

              <label>
                QA Date
                <input
                  type="date"
                  value={metadata.qaDate}
                  onChange={(e) => updateMetadata("qaDate", e.target.value)}
                />
              </label>
            </div>

            <div className="checkbox-line">
              <input
                type="checkbox"
                checked={metadata.isOfficialFinal}
                disabled={metadata.evaluatorRole !== FINAL_REVIEWER_ROLE}
                onChange={(e) => updateMetadata("isOfficialFinal", e.target.checked)}
              />
              <span>
                Mark this as Official Final Score
                {metadata.evaluatorRole !== FINAL_REVIEWER_ROLE &&
                  " — only QA Leader / Final Reviewer can use this"}
              </span>
            </div>

            <div className="notice">
              <strong>Passing rule:</strong> Final score must be equal to or higher than{" "}
              <strong>{appData.passingScore || 90}%</strong>.{" "}
              <strong>N/A counts as full points.</strong>
            </div>

            <div className="notice warning-notice">
              <strong>Important:</strong> Helpers / Coaches / Team Leads can submit{" "}
              <strong>Internal QA</strong> only. Only{" "}
              <strong>QA Leader / Final Reviewer</strong> can submit{" "}
              <strong>Official QA / Final Score</strong>.
            </div>

            <div className="button-row">
              <button className="primary-btn" onClick={startQuiz}>
                Start QA
              </button>

              <button className="manager-btn" onClick={() => setPanel("dashboard")}>
                Manager Dashboards
              </button>

              <button className="secondary-btn" onClick={loadPastSubmissions}>
                View Past Submissions
              </button>

              <a className="secondary-btn" href={api.exportCsvUrl()}>
                <Download size={18} /> Download CSV
              </a>
            </div>
          </section>
        )}

        {panel === "quiz" && currentItem && (
          <section className="panel">
            <LiveScoringBanner
              metadata={metadata}
              liveStats={liveStats}
              currentIndex={currentIndex}
              totalCriteria={criteria.length}
              currentItem={currentItem}
            />

            <div className="quiz-top">
              <div>
                <p className="eyebrow dark-text">
                  Criterion {currentIndex + 1} of {criteria.length}
                </p>
                <h2>{currentItem.criterion}</h2>
              </div>

              <div className="score-box">
                <span>Live Final Screen Score</span>
                <strong>{liveStats.currentPercent}%</strong>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-bar"
                style={{
                  width: `${((currentIndex + 1) / criteria.length) * 100}%`
                }}
              />
            </div>

            <div className="criterion-card">
              <div className="criterion-meta">
                <span className="tag">
                  {qaType === "flights"
                    ? "FLYus / Flights QA"
                    : "Customer Service QA"}
                </span>
                <span className="tag">Max: {currentItem.maxPoints} pts</span>
                <span className="tag">
                  {currentItem.scoringTreatment || "QA Coaching"}
                </span>
              </div>

              <h3>Rubric Score Selection</h3>

              <div className="rating-grid">
                {["Full", "Partial", "Zero", "N/A"].map((rating) => {
                  const selected = answerFor(currentItem.id).rating === rating;
                  const className = `rating-option ${
                    selected ? "active " + rating.toLowerCase().replace("/", "") : ""
                  }`;

                  return (
                    <button
                      key={rating}
                      className={className}
                      onClick={() => updateAnswer(currentItem.id, { rating })}
                    >
                      <strong>{rating}</strong>
                      <span>
                        {rating === "Full" && "Full points"}
                        {rating === "Partial" && "Half points"}
                        {rating === "Zero" && "0 points"}
                        {rating === "N/A" && "Counts as full points"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <LiveCalculation
                answers={answers}
                liveResult={liveResult}
                liveStats={liveStats}
                metadata={metadata}
                currentItem={currentItem}
              />

              <div className="rubric-box">
                <h3>Rubric Calibration Definitions</h3>

                <div className="rubric-grid">
                  <div className="rubric-item zero">
                    <strong>0 Points Reason</strong>
                    <p>
                      {currentItem.zeroReason ||
                        "No zero-point definition provided in rubric."}
                    </p>
                  </div>

                  <div className="rubric-item partial">
                    <strong>Partial Points Reason</strong>
                    <p>
                      {currentItem.partialReason ||
                        "No partial-point definition provided in rubric."}
                    </p>
                  </div>

                  <div className="rubric-item full">
                    <strong>Full Points Reason</strong>
                    <p>
                      {currentItem.fullReason ||
                        "No full-point definition provided in rubric."}
                    </p>
                  </div>
                </div>

                <div className="key-checks">
                  <strong>Matrix Procedure / Key Checks</strong>
                  <p>
                    {currentItem.rubricKeyChecks ||
                      currentItem.keyChecks ||
                      currentItem.formNotes ||
                      "No key checks provided."}
                  </p>
                </div>
              </div>

              {isReservationVerificationCriterion(currentItem.criterion) &&
                (currentItem.subChecks || []).length > 0 && (
                  <SubChecks
                    item={currentItem}
                    answer={answerFor(currentItem.id)}
                    onChange={(next) => updateAnswer(currentItem.id, next)}
                    qaType={qaType}
                  />
                )}

              <label>
                Notes for this criterion
                <textarea
                  value={answerFor(currentItem.id).notes}
                  onChange={(e) =>
                    updateAnswer(currentItem.id, { notes: e.target.value })
                  }
                  placeholder="Add evidence, coaching notes, examples from the call, or explanation for the score..."
                />
              </label>
            </div>

            <div className="button-row space-between">
              <button className="secondary-btn" onClick={previousCriterion}>
                Back
              </button>

              <button
                className="sheet-btn"
                onClick={() => window.open(GOOGLE_SHEET_URL, "_blank")}
              >
                Open Google Sheet
              </button>

              <button className="primary-btn" onClick={nextCriterion}>
                {currentIndex < criteria.length - 1 ? "Next" : "Finish QA"}
              </button>
            </div>
          </section>
        )}

        {panel === "result" && latestResult && (
          <ResultPanel
            result={latestResult}
            metadata={metadata}
            qaType={qaType}
            aiLoading={aiLoading}
            latestAICoaching={latestAICoaching}
            saving={saving}
            autoSaveStatus={autoSaveStatus}
            onBack={() => setPanel("quiz")}
            onAi={generateAICoaching}
            onCopy={copyCoachingNotes}
            onSave={saveSubmission}
          />
        )}

        {panel === "past" && (
          <PastPanel rows={pastRows} onBack={() => setPanel("start")} />
        )}

        {panel === "dashboard" && (
          <DashboardPanel
            input={dashboardInput}
            setInput={setDashboardInput}
            state={dashboardState}
            onLoad={loadDashboard}
            onBack={() => setPanel("start")}
          />
        )}
      </main>

      {coachingPopup && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.card}>
            <button
              style={modalStyles.closeButton}
              onClick={() => setCoachingPopup("")}
              aria-label="Close coaching popup"
            >
              ×
            </button>

            <div style={modalStyles.header}>
              <Brain size={30} />
              <div>
                <h2 style={modalStyles.title}>QA Analyst Coaching</h2>
                <p style={modalStyles.subtitle}>
                  Key coaching opportunities based on failed or partial criteria.
                </p>
              </div>
            </div>

            <div style={modalStyles.body}>{coachingPopup}</div>

            <div style={modalStyles.footer}>
              <button className="secondary-btn" onClick={copyCoachingNotes}>
                Copy Coaching
              </button>

              <button className="primary-btn" onClick={() => setCoachingPopup("")}>
                Continue Scoring
              </button>
            </div>
          </div>
        </div>
      )}

      {ratingPopup && (
        <div className={`rating-popup ${ratingPopup.tone}`}>
          <div className="popup-card">
            <PartyPopper size={34} />
            <h2>{ratingPopup.title}</h2>
            <p>{ratingPopup.message}</p>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "rgba(15, 23, 42, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px"
  },
  card: {
    position: "relative",
    width: "min(920px, 96vw)",
    maxHeight: "88vh",
    overflowY: "auto",
    background: "#f8fffb",
    border: "4px solid #059669",
    borderRadius: "28px",
    boxShadow: "0 30px 90px rgba(0, 0, 0, 0.45)",
    padding: "28px",
    color: "#0f172a"
  },
  closeButton: {
    position: "sticky",
    top: 0,
    float: "right",
    width: "44px",
    height: "44px",
    border: "none",
    borderRadius: "999px",
    background: "#dc2626",
    color: "white",
    fontSize: "32px",
    fontWeight: 900,
    cursor: "pointer",
    lineHeight: 1,
    zIndex: 10
  },
  header: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    borderBottom: "1px solid #d1fae5",
    paddingBottom: "16px",
    marginBottom: "18px"
  },
  title: {
    margin: 0,
    color: "#064e3b",
    fontSize: "28px"
  },
  subtitle: {
    margin: "4px 0 0",
    color: "#475569",
    fontWeight: 700
  },
  body: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
    fontSize: "16px",
    fontWeight: 650,
    color: "#0f172a"
  },
  footer: {
    position: "sticky",
    bottom: 0,
    background: "#f8fffb",
    borderTop: "1px solid #d1fae5",
    marginTop: "20px",
    paddingTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px"
  }
};

function FunnyLoadingScreen({ title, error = "", onRetry }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUNNY_QA_LOADING_MESSAGES.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen funny-loading-screen">
      <div className="funny-loader-card">
        <img
          className="funny-loader-gif"
          src={LOADING_GIF_URL}
          alt="Loading QA app"
        />

        <h1>{title}</h1>

        {!error && (
          <>
            <p className="funny-loader-message">
              {FUNNY_QA_LOADING_MESSAGES[messageIndex]}
            </p>
            <p className="funny-loader-subtext">
              Please wait while the app reads the Google Sheet and prepares the QA form.
            </p>
          </>
        )}

        {error && (
          <>
            <p className="funny-loader-error">{error}</p>
            <button className="primary-btn" onClick={onRetry}>
              Try Again
            </button>
          </>
        )}

        {!error && (
          <div className="funny-loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveScoringBanner({
  metadata,
  liveStats,
  currentIndex,
  totalCriteria,
  currentItem
}) {
  const canSubmitFinal = metadata.evaluatorRole === FINAL_REVIEWER_ROLE;

  return (
    <div className="live-calculation-box">
      <h3>Live Shared Screen Scoring</h3>

      <div className="dashboard-grid">
        <div className="stat-card">
          <span>Who is scoring?</span>
          <strong>{metadata.evaluator || "Not entered"}</strong>
        </div>

        <div className="stat-card">
          <span>Role</span>
          <strong>{metadata.evaluatorRole}</strong>
        </div>

        <div className="stat-card">
          <span>Mode</span>
          <strong>{metadata.evaluationMode}</strong>
        </div>

        <div className="stat-card">
          <span>Live Score</span>
          <strong>{liveStats.currentPercent}%</strong>
        </div>

        <div className="stat-card">
          <span>Live Points</span>
          <strong>
            {liveStats.earnedSoFar} / {liveStats.totalPossible}
          </strong>
        </div>

        <div className="stat-card">
          <span>Criteria Scored</span>
          <strong>
            {liveStats.completedCriteria} / {liveStats.totalCriteria}
          </strong>
        </div>
      </div>

      <div className="calculation-line">
        <span>Agent being evaluated</span>
        <strong>{metadata.agentName || "Not entered"}</strong>
      </div>

      <div className="calculation-line">
        <span>Call Center</span>
        <strong>{metadata.callCenter || "Not selected"}</strong>
      </div>

      <div className="calculation-line">
        <span>Scored items average</span>
        <strong>{liveStats.scoredOnlyPercent}%</strong>
      </div>

      <div className="calculation-line">
        <span>Current criterion</span>
        <strong>
          {currentItem
            ? `${currentIndex + 1} of ${totalCriteria}: ${currentItem.criterion}`
            : "Not started yet"}
        </strong>
      </div>

      <div className="calculation-line">
        <span>Final submission permission</span>
        <strong className={canSubmitFinal ? "calculation-status-pass" : "calculation-status-fail"}>
          {canSubmitFinal
            ? "Can submit Official QA / Final Score"
            : "Internal QA only — cannot submit final score"}
        </strong>
      </div>
    </div>
  );
}

function LiveCalculation({ answers, liveResult, liveStats, metadata, currentItem }) {
  const currentAnswer = answers[currentItem.id] || emptyAnswer();
  const currentEarned = calculateEarned(currentItem, currentAnswer);

  return (
    <div className="live-calculation-box">
      <h3>Live Points Calculation</h3>

      <div className="calculation-line">
        <span>Scored by</span>
        <strong>{metadata.evaluator || "Evaluator not entered yet"}</strong>
      </div>

      <div className="calculation-line">
        <span>Evaluation Mode</span>
        <strong>{metadata.evaluationMode}</strong>
      </div>

      <div className="calculation-line">
        <span>Official Final Score?</span>
        <strong>
          {metadata.isOfficialFinal ? "YES - Official Final Score" : "NO - Internal QA"}
        </strong>
      </div>

      <div className="calculation-line">
        <span>Current criterion points</span>
        <strong>
          {currentEarned} / {currentItem.maxPoints} pts
        </strong>
      </div>

      <div className="calculation-line">
        <span>Live total points</span>
        <strong>
          {liveStats.earnedSoFar} / {liveStats.totalPossible} pts
        </strong>
      </div>

      <div className="calculation-line">
        <span>Live score percentage</span>
        <strong>{liveStats.currentPercent}%</strong>
      </div>

      <div className="calculation-line">
        <span>Completed criteria</span>
        <strong>
          {liveStats.completedCriteria} / {liveStats.totalCriteria}
        </strong>
      </div>

      <div className="calculation-line">
        <span>Current evaluator result</span>
        <strong
          className={
            liveResult.result === "PASSED"
              ? "calculation-status-pass"
              : "calculation-status-fail"
          }
        >
          {liveResult.result}
        </strong>
      </div>

      {liveResult.forceFinalZero && (
        <div className="missed-checks-box">
          <strong>Complete QA Fail Rule Triggered</strong>
          <p>{liveResult.forceFinalZeroReason}</p>
        </div>
      )}

      <div className="individual-points-box">
        <h4>Live Points Breakdown</h4>

        {liveStats.rows.map((row) => (
          <div
            className="calculation-line"
            key={row.id}
            style={{
              background: row.isScored ? "#ecfdf5" : "#fff7ed"
            }}
          >
            <span>
              {row.number}. {row.criterion}
            </span>

            <strong>
              {row.earned} / {row.maxPoints} pts{" "}
              <small>({row.rating})</small>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubChecks({ item, answer, onChange, qaType }) {
  const grouped = (item.subChecks || []).reduce((acc, check) => {
    if (!acc[check.group]) acc[check.group] = [];
    acc[check.group].push(check);
    return acc;
  }, {});

  function updateSubCheck(checkId, value) {
    onChange({
      subChecks: {
        ...(answer.subChecks || {}),
        [checkId]: value
      }
    });
  }

  function updateSubCheckNote(checkId, value) {
    onChange({
      subCheckNotes: {
        ...(answer.subCheckNotes || {}),
        [checkId]: value
      }
    });
  }

  return (
    <div className="subchecks-wrap">
      <h3>
        {qaType === "flights"
          ? "Specific Required FLYus / Flights Checks"
          : "Specific Required Search / Probing Checks"}
      </h3>

      <p>Mark each required behavior and add notes for each selection. N/A counts the same as Yes.</p>

      {Object.keys(grouped).map((group) => (
        <div className="subcheck-group" key={group}>
          <h4>{group}</h4>

          {grouped[group].map((check) => (
            <div className="subcheck-item" key={check.id}>
              <div className="subcheck-title">{check.label}</div>

              <div className="subcheck-controls">
                {["Yes", "No", "N/A"].map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      checked={(answer.subChecks || {})[check.id] === value}
                      onChange={() => updateSubCheck(check.id, value)}
                    />
                    <span>{value === "N/A" ? "N/A (full credit)" : value}</span>
                  </label>
                ))}
              </div>

              <textarea
                value={(answer.subCheckNotes || {})[check.id] || ""}
                onChange={(e) => updateSubCheckNote(check.id, e.target.value)}
                placeholder="Notes for this selection..."
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultPanel({
  result,
  metadata,
  qaType,
  aiLoading,
  latestAICoaching,
  saving,
  autoSaveStatus,
  onBack,
  onAi,
  onCopy,
  onSave
}) {
  const resultStats = calculateLiveScoreStats([], {}, result);

  return (
    <section className="panel">
      <div className={`result-header ${result.result === "PASSED" ? "pass" : "fail"}`}>
        <h2>
          {result.result === "PASSED" ? "✅" : "⚠️"} {result.percent}% - {result.result}
        </h2>

        <p>{result.summary}</p>

        <div className="result-score-grid">
          <div className="result-mini-card">
            <span>Final Score</span>
            <strong>
              {result.score} / {result.maxScore}
            </strong>
          </div>

          <div className="result-mini-card">
            <span>Passing Score</span>
            <strong>{result.passingScore}%</strong>
          </div>

          <div className="result-mini-card">
            <span>Agent</span>
            <strong>{metadata.agentName}</strong>
          </div>

          <div className="result-mini-card">
            <span>Call Center</span>
            <strong>{metadata.callCenter}</strong>
          </div>
        </div>
      </div>

      <LiveScoringBanner
        metadata={metadata}
        liveStats={resultStats}
        currentIndex={0}
        totalCriteria={result.details.length}
        currentItem={{ criterion: "Completed QA Review" }}
      />

      {autoSaveStatus?.saving && (
        <div className="notice">
          <strong>Saving...</strong> QA is being saved automatically to Google Sheet.
        </div>
      )}

      {autoSaveStatus?.saved && (
        <div className="notice">
          <strong>✅ Saved automatically.</strong> This QA was saved to Google Sheet.
        </div>
      )}

      {autoSaveStatus?.error && (
        <div className="notice danger-notice">
          <strong>Save failed.</strong> {autoSaveStatus.error}
        </div>
      )}

      <div className="button-row">
        <button className="secondary-btn" onClick={onBack}>
          Back to Edit
        </button>

        <button className="ai-btn" onClick={onAi} disabled={aiLoading}>
          <Sparkles size={18} /> {aiLoading ? "AI is thinking..." : "Regenerate QA Coaching"}
        </button>

        <button className="secondary-btn" onClick={onCopy}>
          Copy Notes
        </button>

        <button className="secondary-btn" onClick={() => window.print()}>
          Print Coaching
        </button>

        {autoSaveStatus?.saving && (
          <button className="primary-btn" disabled>
            Saving automatically...
          </button>
        )}

        {autoSaveStatus?.saved && (
          <button className="primary-btn" disabled>
            ✅ Saved to Google Sheet
          </button>
        )}

        {autoSaveStatus?.error && (
          <button className="primary-btn" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Retry Save"}
          </button>
        )}
      </div>

      <div className="summary-box">
        <h3>Coaching Summary</h3>
        <p>{result.summary}</p>
        <p>
          <strong>QA Type:</strong>{" "}
          {qaType === "flights" ? "FLYus / Flights QA" : "Customer Service QA"}
        </p>
        <p>
          <strong>Evaluation Mode:</strong> {metadata.evaluationMode}
        </p>
        <p>
          <strong>Evaluator:</strong> {metadata.evaluator}
        </p>
        <p>
          <strong>Evaluator Role:</strong> {metadata.evaluatorRole}
        </p>
        <p>
          <strong>Official Final Score:</strong> {metadata.isOfficialFinal ? "YES" : "NO"}
        </p>
      </div>

      {(aiLoading || latestAICoaching) && (
        <div className={aiLoading ? "ai-loading-card" : "ai-result-card"}>
          {aiLoading ? (
            <>
              <div className="ai-orb" />
              <div>
                <h3>QA analyst is writing coaching...</h3>
                <p>Reviewing missed criteria, notes, score, and coaching opportunities. 🎧</p>
              </div>
            </>
          ) : (
            <>
              <h3>
                <Brain size={22} /> QA Analyst Coaching
              </h3>
              <div className="ai-result-body">{latestAICoaching}</div>
            </>
          )}
        </div>
      )}

      <h3 className="result-section-title">Detailed QA Results</h3>

      {result.details.map((detail) => {
        const cssClass =
          detail.rating === "Full"
            ? "full"
            : detail.rating === "Partial"
              ? "partial"
              : detail.rating === "N/A"
                ? "na"
                : "zero";

        return (
          <div className={`detail-card ${cssClass}`} key={detail.id}>
            <div className="detail-card-header">
              <div>
                <h3>
                  {detail.number}. {detail.criterion}
                </h3>
                <p>
                  <strong>Rating:</strong> {detail.rating || "Not selected"} |{" "}
                  <strong>Treatment:</strong> {detail.scoringTreatment || ""}
                </p>
              </div>

              <div className="detail-score-pill">
                {detail.earned} / {detail.maxPoints} pts
              </div>
            </div>

            <p>
              <strong>Feedback:</strong> {detail.feedback}
            </p>
            <p>
              <strong>Criterion Notes:</strong> {detail.notes || "No notes added."}
            </p>

            {detail.missedSubChecks?.length > 0 && (
              <div className="missed-checks-box">
                <strong>Missed / unclear sub-checks</strong>
                <ul>
                  {detail.missedSubChecks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function PastPanel({ rows, onBack }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow dark-text">Saved QA Results</p>
          <h2>Past Submissions</h2>
        </div>

        <button className="ghost-btn" onClick={onBack}>
          Back
        </button>
      </div>

      {!rows.length && <p>No saved submissions found yet.</p>}

      {rows.map((row, index) => {
        const timestamp = row.Timestamp || row.timestamp || "";
        const agentName = row["Agent Name"] || row.agentName || "Unknown Agent";
        const result = row.Result || row.result || "";
        const qaType = row["QA Type"] || row.qaType || "";
        const mode = row["Evaluation Mode"] || row.evaluationMode || "";
        const officialFinal =
          row["Is Official Final Score"] ||
          row["Official Final Score"] ||
          row.officialFinal ||
          "NO";
        const evaluator = row.Evaluator || row.evaluator || "";
        const evaluatorRole = row["Evaluator Role"] || row.evaluatorRole || "";
        const callCenter = row["Call Center"] || row.callCenter || "";
        const finalPercent = row["Final %"] || row.finalPercent || "";
        const summary = row["Coaching Summary"] || row.summary || "";

        return (
          <div className="past-card" key={`${timestamp}-${index}`}>
            <h3>
              {agentName} - {result}
            </h3>
            <p>
              <strong>QA Type:</strong> {qaType}
            </p>
            <p>
              <strong>Mode:</strong> {mode}
            </p>
            <p>
              <strong>Official Final:</strong> {officialFinal}
            </p>
            <p>
              <strong>Timestamp:</strong> {timestamp}
            </p>
            <p>
              <strong>Evaluator:</strong> {evaluator}
            </p>
            <p>
              <strong>Evaluator Role:</strong> {evaluatorRole}
            </p>
            <p>
              <strong>Call Center:</strong> {callCenter}
            </p>
            <p>
              <strong>Final Score:</strong> {finalPercent}%
            </p>
            <p>{summary}</p>
          </div>
        );
      })}
    </section>
  );
}

function DashboardPanel({ input, setInput, state, onLoad, onBack }) {
  const dashboard = state.dashboard;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow dark-text">Manager View</p>
          <h2>Call Center Dashboard</h2>
        </div>

        <button className="ghost-btn" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="notice">
        Dashboards open only on each call center’s QA day. Off-day access requires manager password.
      </div>

      <div className="form-grid">
        <label>
          Call Center Dashboard
          <select
            value={input.callCenter}
            onChange={(e) => setInput({ ...input, callCenter: e.target.value })}
          >
            <option value="Telus">Telus</option>
            <option value="TEP">TEP</option>
            <option value="Telus/Tep">Telus/Tep</option>
            <option value="Buwelo-C">Buwelo-C</option>
            <option value="Buwelo-G">Buwelo-G</option>
            <option value="WNS">WNS</option>
            <option value="Concentrix">Concentrix</option>
          </select>
        </label>

        <label>
          Manager Password Override
          <input
            type="password"
            value={input.password}
            onChange={(e) => setInput({ ...input, password: e.target.value })}
            placeholder="Only needed outside QA day"
          />
        </label>

        <label>
          Official Scores Only
          <span className="checkbox-line no-margin">
            <input
              type="checkbox"
              checked={input.officialOnly}
              onChange={(e) =>
                setInput({ ...input, officialOnly: e.target.checked })
              }
            />
            Show official final scores only
          </span>
        </label>
      </div>

      <div className="button-row">
        <button className="manager-btn" onClick={onLoad}>
          {state.loading ? "Loading..." : "Open Dashboard"}
        </button>
      </div>

      {state.access && (
        <div className={`notice ${state.access.allowed ? "" : "danger-notice"}`}>
          <strong>{state.access.allowed ? "Dashboard Status" : "Dashboard Locked"}</strong>
          <br />
          {state.access.message}
        </div>
      )}

      {dashboard && (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <span>Total QAs</span>
              <strong>{dashboard.total}</strong>
            </div>

            <div className="stat-card">
              <span>Average Score</span>
              <strong>{dashboard.avgScore}%</strong>
            </div>

            <div className="stat-card">
              <span>Pass Rate</span>
              <strong>{dashboard.passRate}%</strong>
            </div>

            <div className="stat-card">
              <span>Needs Improvement</span>
              <strong>{dashboard.needsImprovement}</strong>
            </div>
          </div>

          <TableCard
            title="Top Coaching Opportunities"
            empty="No coaching opportunities found yet."
            headers={["Criterion", "Times Missed / Partial"]}
            rows={(dashboard.topOpportunities || dashboard.criteria || []).map((item) => [
              item.criterion,
              item.count || item.missed || 0
            ])}
          />

          <TableCard
            title="Agents Needing Attention / Lowest Average Scores"
            empty="No agent data found yet."
            headers={[
              "Agent",
              "QA Count",
              "Average Score",
              "Latest Score",
              "Latest Result"
            ]}
            rows={(dashboard.agents || []).map((item) => [
              item.agent,
              item.count,
              `${item.avgScore}%`,
              `${item.latestScore}%`,
              item.latestResult
            ])}
          />

          <TableCard
            title="Evaluators / Leaders"
            empty="No evaluator data found yet."
            headers={["Evaluator", "QA Count"]}
            rows={(dashboard.evaluators || []).map((item) => [
              item.evaluator,
              item.count
            ])}
          />
        </>
      )}
    </section>
  );
}

function TableCard({ title, headers, rows, empty }) {
  return (
    <div className="inner-panel">
      <h3>{title}</h3>

      {!rows.length ? (
        <p>{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>{escapeText(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;