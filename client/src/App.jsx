// C:\Users\User\Downloads\QA-Form-2026-main\QA-Form-2026-main\client\src\App.jsx

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
    window.setTimeout(() => setToast(""), 2800);
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

      if (criterionName.includes("documentation quality") && !notes) {
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

      (item.subChecks || []).forEach((check) => {
        const selected = answer.subChecks?.[check.id] || "";

        if (selected === "Yes" || selected === "N/A") {
          completedSubChecks.push(check.label);
        } else {
          missedSubChecks.push(check.label);
        }
      });

      let feedback = "";

      if (rating === "Full" || rating === "N/A") {
        feedback = item.fullReason || "Meets full QA expectations.";
      } else if (rating === "Partial") {
        feedback = item.partialReason || "Partial credit. Some expected behaviors were missed.";
      } else {
        feedback = item.zeroReason || "No credit. Required QA behavior was missed.";
      }

      if (criterionName.includes("documentation quality") && !notes) {
        feedback =
          "Complete QA fail: Documentation Quality requires notes/evidence. No notes were added, so the final QA score is forced to 0%.";
      }

      if (missedSubChecks.length > 0) {
        feedback += " Missed or unclear sub-checks: " + missedSubChecks.join("; ") + ".";
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

  function finishQA() {
    const result = calculateLocalResult();
    setLatestResult(result);
    setLatestAICoaching("");
    setPanel("result");
  }

  async function generateAICoaching() {
    if (!latestResult) {
      showToast("Finish the QA first.");
      return;
    }

    setAiLoading(true);
    setLatestAICoaching("");

    try {
      const response = await api.aiCoaching({
        metadata: {
          ...metadata,
          qaType
        },
        result: latestResult
      });

      if (!response.ok || !response.coaching) {
        setLatestAICoaching(
          `${response.friendlyError || "AI coaching did not generate."}\n\n${response.technicalError || ""}`
        );
        showToast("AI coaching did not generate.");
        return;
      }

      setLatestAICoaching(response.coaching);
      showToast("AI coaching generated.");
    } catch (err) {
      setLatestAICoaching(`🤖 AI Coaching Error\n\n${err.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveSubmission() {
    if (!latestResult) return;

    if (metadata.evaluationMode === "Official QA" && metadata.evaluatorRole !== FINAL_REVIEWER_ROLE) {
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
      setAnswers({});
      setLatestResult(null);
      setLatestAICoaching("");
      setPanel("start");
      showToast("QA response saved to Google Sheet.");
    } catch (err) {
      showToast(err.message || "Could not save QA.");
    } finally {
      setSaving(false);
    }
  }

  function copyCoachingNotes() {
    if (!latestResult) return;

    let text = "";
    text += "QA Coaching Summary\n";
    text += `QA Type: ${qaType === "flights" ? "FLYus / Flights QA" : "Customer Service QA"}\n`;
    text += `Evaluation Mode: ${metadata.evaluationMode}\n`;
    text += `Official Final Score: ${metadata.isOfficialFinal ? "YES" : "NO"}\n`;
    text += `Agent: ${metadata.agentName}\n`;
    text += `Evaluator: ${metadata.evaluator}\n`;
    text += `Evaluator Role: ${metadata.evaluatorRole}\n`;
    text += `Call Center: ${metadata.callCenter}\n`;
    text += `Score: ${latestResult.percent}% - ${latestResult.result}\n\n`;
    text += latestResult.summary + "\n\n";

    if (latestAICoaching) {
      text += "AI Coaching Summary:\n" + latestAICoaching + "\n\n";
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
            React + Netlify frontend, Render backend, Google Sheets storage, and OpenAI coaching.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setPanel("start")}>
              <ShieldCheck size={18} /> Start QA
            </button>

            <button className="manager-btn" onClick={() => setPanel("dashboard")}>
              <Gauge size={18} /> Manager Dashboard
            </button>

            <a className="sheet-btn" href={GOOGLE_SHEET_URL} target="_blank" rel="noreferrer">
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
              liveResult={liveResult}
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
                  <option value="QA Leader / Final Reviewer">QA Leader / Final Reviewer</option>
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
              liveResult={liveResult}
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
                <strong>{liveResult.percent}%</strong>
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
                  {qaType === "flights" ? "FLYus / Flights QA" : "Customer Service QA"}
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
                criteria={criteria}
                answers={answers}
                liveResult={liveResult}
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

              {(currentItem.subChecks || []).length > 0 && (
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

function FunnyLoadingScreen({ title, error = "", onRetry }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUNNY_QA_LOADING_MESSAGES.length);
    }, 1000);

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

function LiveScoringBanner({ metadata, liveResult, currentIndex, totalCriteria, currentItem }) {
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
          <strong>{liveResult.percent}%</strong>
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
        <span>Current points calculation</span>
        <strong>
          {liveResult.score} / {liveResult.maxScore} pts
        </strong>
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

function LiveCalculation({ criteria, answers, liveResult, metadata, currentItem }) {
  const currentAnswer = answers[currentItem.id] || emptyAnswer();
  const currentEarned = calculateEarned(currentItem, currentAnswer);

  const rawScore = criteria.reduce((sum, item) => {
    return sum + calculateEarned(item, answers[item.id] || emptyAnswer());
  }, 0);

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
        <span>Current evaluator total before complete-fail rule</span>
        <strong>
          {rawScore} / {liveResult.maxScore} pts
        </strong>
      </div>

      <div className="calculation-line">
        <span>Final evaluator percentage</span>
        <strong>{liveResult.percent}%</strong>
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
        <h4>Individual Points Live Breakdown</h4>

        {criteria.map((criterion) => {
          const answer = answers[criterion.id] || emptyAnswer();
          const earned = calculateEarned(criterion, answer);

          return (
            <div className="calculation-line" key={criterion.id}>
              <span>
                {criterion.number}. {criterion.criterion}
              </span>
              <strong>
                {earned} / {criterion.maxPoints} pts{" "}
                <small>({answer.rating || "Not selected"})</small>
              </strong>
            </div>
          );
        })}
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
  onBack,
  onAi,
  onCopy,
  onSave
}) {
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
        liveResult={result}
        currentIndex={0}
        totalCriteria={result.details.length}
        currentItem={{ criterion: "Completed QA Review" }}
      />

      <div className="button-row">
        <button className="secondary-btn" onClick={onBack}>
          Back to Edit
        </button>

        <button className="ai-btn" onClick={onAi} disabled={aiLoading}>
          <Sparkles size={18} /> {aiLoading ? "AI is thinking..." : "Generate AI Coaching"}
        </button>

        <button className="secondary-btn" onClick={onCopy}>
          Copy Notes
        </button>

        <button className="secondary-btn" onClick={() => window.print()}>
          Print Coaching
        </button>

        <button className="primary-btn" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save to Google Sheet"}
        </button>
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
                <h3>AI coach is reviewing the score...</h3>
                <p>Checking missed criteria, notes, critical gates, and coaching opportunities. 🎧</p>
              </div>
            </>
          ) : (
            <>
              <h3>
                <Brain size={22} /> AI Coaching Summary
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
        const officialFinal = row["Is Official Final Score"] || row.officialFinal || "NO";
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