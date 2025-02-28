import { analyzeText } from "./services/detector.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { firebaseConfig } from "../../../shared/utils/firebase-config.js";
import {
  showToast,
  showLoading,
  hideLoading,
} from "../../../shared/utils/ui.js";

// DOM Elements
let textInput,
  wordCount,
  scanBtn,
  clearBtn,
  resultsContent,
  emptyState,
  aiScore,
  aiLabel,
  plagiarismScore,
  plagiarismLabel,
  styleBar,
  patternBar,
  coherenceBar,
  aiSummary,
  matchesList,
  plagiarismSummary,
  tabBtns,
  tabContents,
  charCount,
  wordLimit,
  showTipsBtn,
  tipsDropdown,
  toolBtns,
  saveBtn,
  exportBtn,
  writingTips,
  citationTips;

// Constants
const MIN_WORDS = 50;
const MAX_WORDS = 5000;
const WORD_WARNING_THRESHOLD = 4500;

// State
let isAnalyzing = false;
let currentUser = null;
let lastResults = null;

// Helper Functions
function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function updateCounts() {
  const text = textInput.value;
  const words = countWords(text);
  const chars = text.length;

  wordCount.textContent = words;
  charCount.textContent = chars;

  // Update word limit warning
  if (words > WORD_WARNING_THRESHOLD) {
    wordLimit.textContent = ` (${MAX_WORDS - words} words remaining)`;
    wordLimit.classList.add("warning");
  } else {
    wordLimit.textContent = "";
    wordLimit.classList.remove("warning");
  }

  return { words, chars };
}

function formatText() {
  const text = textInput.value;
  // Remove extra whitespace and normalize paragraphs
  const formatted = text
    .replace(/[\r\n]+/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  textInput.value = formatted;
  updateCounts();
}

function removeFormatting() {
  const text = textInput.value;
  // Remove all formatting, keeping only plain text
  const plainText = text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  textInput.value = plainText;
  updateCounts();
}

async function saveResults() {
  if (!lastResults) return;

  try {
    const timestamp = new Date().toISOString();
    const filename = `analysis_${timestamp}.json`;
    const blob = new Blob([JSON.stringify(lastResults, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Results saved successfully", "success");
  } catch (error) {
    console.error("[Detector] Error saving results:", error);
    showToast("Error saving results", "error");
  }
}

async function exportToPDF() {
  if (!lastResults) return;

  try {
    showLoading("Generating PDF...");

    // Create PDF content
    const content = `
      AI Detection & Plagiarism Report
      Generated: ${new Date().toLocaleString()}
      
      AI Analysis:
      Overall Score: ${lastResults.aiMetrics.overall}%
      Writing Style: ${lastResults.aiMetrics.style}%
      Pattern Analysis: ${lastResults.aiMetrics.pattern}%
      Language Coherence: ${lastResults.aiMetrics.coherence}%
      
      Plagiarism Analysis:
      Matches Found: ${lastResults.plagiarismMatches.length}
      
      ${lastResults.plagiarismMatches
        .map(
          (match) => `
        Source: ${match.source}
        Similarity: ${match.similarity}%
        Matched Text: ${match.matchedText || "N/A"}
      `
        )
        .join("\n")}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideLoading();
    showToast("Report exported successfully", "success");
  } catch (error) {
    console.error("[Detector] Error exporting PDF:", error);
    hideLoading();
    showToast("Error exporting report", "error");
  }
}

function updateSuggestions(aiMetrics, plagiarismMatches) {
  // Writing Tips based on AI analysis
  const tips = [];
  if (aiMetrics.style > 70) {
    tips.push("Consider varying your sentence structure and vocabulary more");
  }
  if (aiMetrics.pattern > 70) {
    tips.push("Try to break up repetitive patterns in your writing");
  }
  if (aiMetrics.coherence < 50) {
    tips.push("Focus on improving transitions between ideas");
  }

  writingTips.innerHTML = tips
    .map((tip) => `<li><i class="fas fa-check"></i>${tip}</li>`)
    .join("");

  // Citation Tips based on plagiarism matches
  const citationTips = [];
  if (plagiarismMatches.length > 0) {
    citationTips.push("Remember to cite all external sources");
    citationTips.push("Use quotation marks for direct quotes");
    if (plagiarismMatches.some((m) => m.similarity > 70)) {
      citationTips.push("Consider paraphrasing instead of direct copying");
    }
  }

  citationTips.innerHTML = citationTips
    .map((tip) => `<li><i class="fas fa-check"></i>${tip}</li>`)
    .join("");
}

function setBarWidth(bar, percentage) {
  bar.style.width = `${percentage}%`;
}

function getAISummary(metrics) {
  const summaries = {
    high: "This text shows strong indicators of AI generation, including consistent writing patterns and highly structured language.",
    medium:
      "Some aspects of this text suggest potential AI involvement, though it may be mixed with human writing.",
    low: "This text displays characteristics more commonly associated with human writing.",
  };

  if (metrics.overall >= 80) return summaries.high;
  if (metrics.overall >= 60) return summaries.medium;
  return summaries.low;
}

function getPlagiarismSummary(matches) {
  if (matches.length === 0) {
    return "No significant matches found. The text appears to be original.";
  }

  const totalSimilarity =
    matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length;

  if (totalSimilarity >= 70) {
    return "High levels of potential plagiarism detected. Significant matches found with existing sources.";
  } else if (totalSimilarity >= 40) {
    return "Moderate similarity with existing sources detected. Some content may need attribution.";
  } else {
    return "Low similarity with existing sources. Minor matches detected.";
  }
}

function updateResults(aiMetrics, plagiarismMatches) {
  // Update AI scores and metrics
  aiScore.textContent = Math.max(0, Math.round(aiMetrics.overall));
  setBarWidth(styleBar, Math.max(0, aiMetrics.style));
  setBarWidth(patternBar, Math.max(0, aiMetrics.pattern));
  setBarWidth(coherenceBar, Math.max(0, aiMetrics.coherence));
  aiSummary.textContent = getAISummary(aiMetrics);

  // Update AI label
  if (aiMetrics.overall >= 80) {
    aiLabel.textContent = "Likely AI Generated";
    aiLabel.style.color = "#ff4e4e";
  } else if (aiMetrics.overall >= 60) {
    aiLabel.textContent = "Possibly AI Generated";
    aiLabel.style.color = "#ffc107";
  } else {
    aiLabel.textContent = "Likely Human Written";
    aiLabel.style.color = "#00ff9d";
  }

  // Update plagiarism results
  const avgSimilarity = plagiarismMatches.length
    ? plagiarismMatches.reduce((sum, match) => sum + match.similarity, 0) /
      plagiarismMatches.length
    : 0;

  plagiarismScore.textContent = Math.round(avgSimilarity);
  plagiarismSummary.textContent = getPlagiarismSummary(plagiarismMatches);

  // Update plagiarism label
  if (avgSimilarity >= 70) {
    plagiarismLabel.textContent = "High Risk";
    plagiarismLabel.style.color = "#ff4e4e";
  } else if (avgSimilarity >= 40) {
    plagiarismLabel.textContent = "Medium Risk";
    plagiarismLabel.style.color = "#ffc107";
  } else {
    plagiarismLabel.textContent = "Low Risk";
    plagiarismLabel.style.color = "#00ff9d";
  }

  // Update matches list with improved display
  matchesList.innerHTML = plagiarismMatches
    .map(
      (match) => `
        <div class="match-item">
          <div class="match-header">
            <a href="${
              match.source
            }" target="_blank" rel="noopener noreferrer" class="match-source">
              <i class="fas fa-external-link-alt"></i>
              ${new URL(match.source).hostname}
            </a>
            <span class="match-similarity">${match.similarity}% Similar</span>
          </div>
          <div class="match-text">
            <div class="original-text">
              <strong>Original Text:</strong>
              <p>${match.text}</p>
            </div>
            ${
              match.matchedText
                ? `<div class="matched-text">
                    <strong>Matched Text:</strong>
                    <p>${match.matchedText}</p>
                   </div>`
                : ""
            }
          </div>
        </div>
      `
    )
    .join("");
}

// Initialize DOM elements
function initializeDOMElements() {
  textInput = document.getElementById("textInput");
  wordCount = document.getElementById("wordCount");
  scanBtn = document.querySelector(".scan-btn");
  clearBtn = document.querySelector(".clear-btn");
  resultsContent = document.querySelector(".results-content");
  emptyState = document.querySelector(".empty-state");
  aiScore = document.getElementById("aiScore");
  aiLabel = document.getElementById("aiLabel");
  plagiarismScore = document.getElementById("plagiarismScore");
  plagiarismLabel = document.getElementById("plagiarismLabel");
  styleBar = document.getElementById("styleBar");
  patternBar = document.getElementById("patternBar");
  coherenceBar = document.getElementById("coherenceBar");
  aiSummary = document.getElementById("aiSummary");
  matchesList = document.getElementById("matchesList");
  plagiarismSummary = document.getElementById("plagiarismSummary");
  tabBtns = document.querySelectorAll(".tab-btn");
  tabContents = document.querySelectorAll(".tab-content");
  charCount = document.getElementById("charCount");
  wordLimit = document.getElementById("wordLimit");
  showTipsBtn = document.getElementById("showTipsBtn");
  tipsDropdown = document.querySelector(".tips-dropdown");
  toolBtns = document.querySelectorAll(".tool-btn");
  saveBtn = document.querySelector(".save-btn");
  exportBtn = document.querySelector(".export-btn");
  writingTips = document.getElementById("writingTips");
  citationTips = document.getElementById("citationTips");
}

// Initialize event listeners
function initializeEventListeners() {
  if (textInput) {
    textInput.addEventListener("input", updateCounts);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (textInput) textInput.value = "";
      updateCounts();
      if (emptyState) emptyState.style.display = "flex";
      if (resultsContent) resultsContent.style.display = "none";
      if (saveBtn) saveBtn.disabled = true;
      if (exportBtn) exportBtn.disabled = true;
      lastResults = null;
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener("click", handleScanClick);
  }

  // Initialize tab functionality
  if (tabBtns) {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-tab");
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const targetContent = document.querySelector(
          `.tab-content[data-tab="${target}"]`
        );
        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });
  }

  // Initialize text tools
  if (toolBtns) {
    toolBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        switch (action) {
          case "paste":
            navigator.clipboard
              .readText()
              .then((text) => {
                if (textInput) {
                  textInput.value = text;
                  updateCounts();
                }
              })
              .catch(() => showToast("Unable to paste text", "error"));
            break;
          case "clear":
            if (textInput) {
              textInput.value = "";
              updateCounts();
            }
            break;
          case "format":
            formatText();
            break;
          case "removeFormatting":
            removeFormatting();
            break;
        }
      });
    });
  }

  // Initialize help tooltip
  if (showTipsBtn && tipsDropdown) {
    showTipsBtn.addEventListener("click", () => {
      tipsDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".tip-actions")) {
        tipsDropdown.classList.remove("show");
      }
    });
  }

  // Initialize save/export buttons
  if (saveBtn) saveBtn.addEventListener("click", saveResults);
  if (exportBtn) exportBtn.addEventListener("click", exportToPDF);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Detector] Initializing...");

  try {
    // Initialize DOM elements
    initializeDOMElements();

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Auth state observer
    onAuthStateChanged(auth, (user) => {
      console.log(
        "[Detector] Auth state changed:",
        user ? "logged in" : "logged out"
      );
      currentUser = user;
      if (!user) {
        showToast("Please log in to use the detector", "info");
      }
    });

    // Initialize all event listeners
    initializeEventListeners();
  } catch (error) {
    console.error("[Detector] Initialization error:", error);
    showToast("Error initializing application", "error");
  }
});

// Move scan button handler to separate function
async function handleScanClick() {
  if (isAnalyzing || !textInput) return;

  const text = textInput.value.trim();
  const { words } = updateCounts();

  if (words < MIN_WORDS) {
    showToast(`Please enter at least ${MIN_WORDS} words`, "error");
    return;
  }

  if (words > MAX_WORDS) {
    showToast(`Text exceeds maximum limit of ${MAX_WORDS} words`, "error");
    return;
  }

  if (!currentUser) {
    showToast("Please log in to use the detector", "error");
    return;
  }

  try {
    isAnalyzing = true;
    showLoading("Analyzing text...", "This may take a few moments");

    const result = await analyzeText(text, currentUser.uid);

    if (!result.success) {
      throw new Error(result.error || "Analysis failed");
    }

    lastResults = result;

    // Enable save/export buttons
    if (saveBtn) saveBtn.disabled = false;
    if (exportBtn) exportBtn.disabled = false;

    // Hide empty state and show results
    if (emptyState) emptyState.style.display = "none";
    if (resultsContent) resultsContent.style.display = "block";

    // Update all results
    updateResults(result.aiMetrics, result.plagiarismMatches);
    updateSuggestions(result.aiMetrics, result.plagiarismMatches);

    // Show the first tab by default
    if (tabBtns && tabBtns.length > 0) {
      tabBtns[0].click();
    }
  } catch (error) {
    console.error("[Detector] Analysis error:", error);
    showToast(error.message || "An error occurred during analysis", "error");
  } finally {
    isAnalyzing = false;
    hideLoading();
  }
}
