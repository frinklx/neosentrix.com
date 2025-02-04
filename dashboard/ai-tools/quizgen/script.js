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
  charCount,
  generateBtn,
  saveBtn,
  exportBtn,
  emptyState,
  quizPreview,
  questionsList,
  answerKey,
  mcqType,
  trueFalseType,
  fillBlanksType,
  difficultyLevel,
  questionCount,
  previewBtns,
  loadingScreen,
  loadingProgress,
  loadingText,
  exampleModal,
  showExampleBtn,
  closeModalBtn,
  quizMode,
  quizContent,
  quizTimer,
  quizProgress,
  quizExitBtn,
  quizScoreDisplay,
  skipBtn,
  timerCircle;

// State
let currentUser = null;
let lastQuiz = null;
let isGenerating = false;

// Constants
const MIN_WORDS = 100;
const MAX_WORDS = 5000;

// Initialize DOM elements
function initializeDOMElements() {
  textInput = document.getElementById("textInput");
  wordCount = document.getElementById("wordCount");
  charCount = document.getElementById("charCount");
  generateBtn = document.getElementById("generateBtn");
  saveBtn = document.getElementById("saveBtn");
  exportBtn = document.getElementById("exportBtn");
  emptyState = document.getElementById("emptyState");
  quizPreview = document.getElementById("quizPreview");
  questionsList = document.getElementById("questionsList");
  answerKey = document.getElementById("answerKey");
  mcqType = document.getElementById("mcqType");
  trueFalseType = document.getElementById("trueFalseType");
  fillBlanksType = document.getElementById("fillBlanksType");
  difficultyLevel = document.getElementById("difficultyLevel");
  questionCount = document.getElementById("questionCount");
  previewBtns = document.querySelectorAll(".preview-btn");
  loadingScreen = document.getElementById("loadingScreen");
  loadingProgress = document.querySelector(".progress-fill");
  loadingText = document.querySelector(".progress-text");
  exampleModal = document.getElementById("exampleModal");
  showExampleBtn = document.getElementById("showExampleBtn");
  closeModalBtn = document.querySelector(".close-modal");
  quizMode = document.querySelector(".quiz-mode");
  quizContent = document.querySelector(".quiz-content");
  quizTimer = document.querySelector(".quiz-timer");
  quizProgress = document.querySelector(".quiz-progress");
  quizExitBtn = document.querySelector(".quiz-exit-btn");
  quizScoreDisplay = document.querySelector(".quiz-score span");
  skipBtn = document.querySelector(".skip-btn");
  timerCircle = document.querySelector(".timer-circle");
}

// Helper Functions
function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function updateCounts() {
  if (!textInput) return { words: 0, chars: 0 };

  const text = textInput.value;
  const words = countWords(text);
  const chars = text.length;

  if (wordCount) wordCount.textContent = words;
  if (charCount) charCount.textContent = chars;

  return { words, chars };
}

// Question Generation Logic
function extractKeyPhrases(text) {
  // Split text into paragraphs for context
  const paragraphs = text.split(/\n+/);

  // Split into sentences more accurately
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      // Filter out short or informal sentences
      if (s.length < 20) return false; // Too short
      if (s.includes("?") && s.length < 30) return false; // Short questions
      if (/^(hi|hey|hello|thanks|thank you)/i.test(s)) return false; // Greetings
      if (/[😀-🙏]/u.test(s)) return false; // Contains emojis
      return true;
    });

  // Important patterns for identifying key information
  const importantPatterns = [
    /\b(is|are|was|were)\b.*\b(because|due to|as a result of)\b/i,
    /\b(defined as|refers to|means)\b/i,
    /\b(consists of|contains|comprises)\b/i,
    /\b(if|then|therefore|thus)\b/i,
    /\b(must|should|have to|need to)\b/i,
    /\b(more than|less than|equal to)\b/i,
    /\b(first|second|third|finally)\b/i,
    /\b(for example|such as|including)\b/i,
  ];

  const keyPhrases = sentences
    .map((sentence) => {
      // Clean the sentence while preserving important words
      const cleaned = sentence
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            ![
              "the",
              "a",
              "an",
              "and",
              "or",
              "but",
              "in",
              "on",
              "at",
              "to",
              "for",
              "of",
              "with",
              "by",
            ].includes(word)
        )
        .join(" ");

      // Calculate importance score
      let score = 0;

      // Check for important patterns
      importantPatterns.forEach((pattern) => {
        if (pattern.test(sentence)) score += 2;
      });

      // Check for numerical data
      if (/\d+/.test(sentence)) score += 2;

      // Check for proper nouns
      const properNouns = sentence.match(/(?<!^|\.\s+)\b[A-Z][a-z]+\b/g) || [];
      score += properNouns.length;

      // Check for technical terms (words not in common vocabulary)
      const words = cleaned.split(" ");
      const uniqueWords = new Set(words);
      score += uniqueWords.size * 0.5;

      // Penalize very short or very long sentences
      if (words.length < 5) score -= 3;
      if (words.length > 30) score -= 2;

      // Find context from surrounding sentences
      const sentenceIndex = sentences.indexOf(sentence);
      const context = {
        previous: sentenceIndex > 0 ? sentences[sentenceIndex - 1] : null,
        next:
          sentenceIndex < sentences.length - 1
            ? sentences[sentenceIndex + 1]
            : null,
      };

      // Find containing paragraph
      const paragraph = paragraphs.find((p) => p.includes(sentence)) || "";

      return {
        original: sentence,
        cleaned,
        importance: score,
        context,
        paragraph,
        properNouns,
        hasNumbers: /\d+/.test(sentence),
        patterns: importantPatterns.filter((p) => p.test(sentence)),
        wordCount: words.length,
      };
    })
    // Filter out low-quality phrases
    .filter((phrase) => {
      if (phrase.importance < 2) return false; // Too unimportant
      if (phrase.wordCount < 5) return false; // Too short
      if (!phrase.context.previous && !phrase.context.next) return false; // No context
      return true;
    });

  return keyPhrases.sort((a, b) => b.importance - a.importance);
}

function generateMCQQuestion(keyPhrase) {
  const { original, cleaned, context, properNouns, hasNumbers, patterns } =
    keyPhrase;

  // Determine question type
  let questionType = "fact";
  if (patterns.some((p) => /because|due to|as a result of/i.test(p.source))) {
    questionType = "cause-effect";
  } else if (
    patterns.some((p) => /defined as|refers to|means/i.test(p.source))
  ) {
    questionType = "definition";
  } else if (patterns.some((p) => /if|then|therefore|thus/i.test(p.source))) {
    questionType = "logical";
  }

  let question = original;
  let correctAnswer = "";
  let options = [];

  // Generate question based on type
  switch (questionType) {
    case "cause-effect":
      const [cause, effect] = original.split(/because|due to|as a result of/i);
      question = `What is the reason that ${cause.trim()}?`;
      correctAnswer = effect.trim();
      break;

    case "definition":
      const [term, definition] = original.split(
        /is defined as|refers to|means/i
      );
      question = `What is the correct definition of ${term.trim()}?`;
      correctAnswer = definition.trim();
      break;

    case "logical":
      question = `Based on the text, which statement logically follows?`;
      correctAnswer = context.next || original;
      break;

    default:
      if (properNouns.length > 0) {
        const noun = properNouns[0];
        question = original.replace(noun, "_____");
        correctAnswer = noun;
      } else if (hasNumbers) {
        const number = original.match(/\d+/)[0];
        question = original.replace(number, "_____");
        correctAnswer = number;
      } else {
        const words = cleaned.split(" ").filter((w) => w.length > 4);
        const wordToMask = words[Math.floor(Math.random() * words.length)];
        question = original.replace(new RegExp(wordToMask, "i"), "_____");
        correctAnswer = wordToMask;
      }
  }

  // Generate smart distractors
  options = generateDistractors(correctAnswer, keyPhrase);

  // Validate question
  const validation = validateQuestion(
    question,
    correctAnswer,
    options,
    keyPhrase
  );
  if (!validation.isValid) {
    console.log("[Quiz Generator] Invalid question:", validation.reason);
    return null;
  }

  options.push(correctAnswer);
  options = shuffleArray(options);

  return {
    type: "mcq",
    question,
    options,
    correctAnswer: options.indexOf(correctAnswer),
    metadata: {
      type: questionType,
      context: keyPhrase.context,
      validation: validation.details,
    },
  };
}

function generateDistractors(correctAnswer, keyPhrase) {
  // Safety check for invalid input
  if (!correctAnswer || typeof correctAnswer !== "string") {
    console.log(
      "[Quiz Generator] Invalid correct answer for distractor generation"
    );
    return ["Option A", "Option B", "Option C"];
  }

  const distractors = new Set();
  const { context, paragraph, properNouns } = keyPhrase;

  // Use proper nouns as distractors
  if (properNouns && properNouns.length > 0) {
    properNouns.forEach((noun) => {
      if (noun && noun !== correctAnswer) distractors.add(noun);
    });
  }

  // Use related terms from context
  if (paragraph) {
    const relatedTerms = paragraph
      .split(/\s+/)
      .filter(
        (word) =>
          word &&
          word.length > 4 &&
          word !== correctAnswer &&
          !distractors.has(word)
      );

    relatedTerms.slice(0, 2).forEach((term) => term && distractors.add(term));
  }

  // Generate additional distractors if needed
  while (distractors.size < 3) {
    if (!isNaN(correctAnswer)) {
      // For numbers, generate close values
      const num = parseInt(correctAnswer);
      distractors.add(String(num + Math.floor(Math.random() * 5) + 1));
    } else {
      // For text, modify the correct answer
      const modified = modifyAnswer(correctAnswer);
      if (modified && modified !== correctAnswer) {
        distractors.add(modified);
      } else {
        // Fallback options if modification fails
        distractors.add(correctAnswer + " (alt)");
      }
    }
  }

  return Array.from(distractors).slice(0, 3);
}

function modifyAnswer(text) {
  // Safety check for invalid input
  if (!text || typeof text !== "string" || text.length < 2) {
    return text;
  }

  const modifications = [
    (text) => (text.length > 3 ? "un" + text : text),
    (text) => (text.length > 3 ? text + "ing" : text),
    (text) => text.replace(/[aeiou]/i, "a"),
    (text) => (text.length > 3 ? text.slice(1) : text),
    (text) => text.split("").reverse().join(""),
  ];

  // Try each modification until we get a valid one
  for (const mod of modifications) {
    try {
      const result = mod(text);
      if (result && result !== text && result.length >= 2) {
        return result;
      }
    } catch (e) {
      console.log("[Quiz Generator] Modification error:", e);
      continue;
    }
  }

  // Fallback: return slightly modified version of the text
  return text + "s";
}

function validateQuestion(question, correctAnswer, options, keyPhrase) {
  const validation = {
    isValid: true,
    reason: "",
    details: {},
  };

  // Basic validation
  if (question.length < 10) {
    return { isValid: false, reason: "Question too short" };
  }

  if (!question.includes("?") && !question.includes("_____")) {
    return { isValid: false, reason: "Not a proper question" };
  }

  if (!correctAnswer || correctAnswer.length < 1) {
    return { isValid: false, reason: "Invalid answer" };
  }

  // Check for duplicates
  if (new Set(options).size !== options.length) {
    return { isValid: false, reason: "Duplicate options" };
  }

  // Validate against context
  const { original, context, paragraph } = keyPhrase;
  const combinedContext = [original, context.previous, context.next, paragraph]
    .join(" ")
    .toLowerCase();

  validation.details = {
    contextMatch: combinedContext.includes(correctAnswer.toLowerCase()),
    answerLengthVariance:
      Math.max(...options.map((o) => o.length)) /
      Math.min(...options.map((o) => o.length)),
    hasContext: !!context.previous && !!context.next,
  };

  // Additional validation checks
  if (validation.details.answerLengthVariance > 3) {
    return { isValid: false, reason: "Answer lengths too inconsistent" };
  }

  if (!validation.details.contextMatch) {
    validation.details.warning = "Answer not found in original context";
  }

  return validation;
}

function generateTrueFalseQuestion(keyPhrase) {
  const { original, context, patterns } = keyPhrase;

  // Determine if we should negate or modify the statement
  const shouldNegate = Math.random() > 0.5;
  let question = original;
  let isTrue = true;

  if (shouldNegate) {
    // Modify the statement to make it false
    if (patterns.some((p) => /more than|less than|equal to/i.test(p.source))) {
      // Flip comparisons
      question = question
        .replace(/more than/i, "less than")
        .replace(/less than/i, "more than")
        .replace(/equal to/i, "not equal to");
      isTrue = false;
    } else if (
      patterns.some((p) => /always|never|every|all|none/i.test(p.source))
    ) {
      // Flip absolutes
      question = question
        .replace(/always/i, "never")
        .replace(/never/i, "always")
        .replace(/every/i, "some")
        .replace(/all/i, "none")
        .replace(/none/i, "all");
      isTrue = false;
    } else {
      // Insert "not" or remove it
      if (question.includes(" not ")) {
        question = question.replace(" not ", " ");
      } else {
        const verb = question.match(/\b(is|are|was|were|has|have)\b/i);
        if (verb) {
          question = question.replace(verb[0], `${verb[0]} not`);
          isTrue = false;
        }
      }
    }
  }

  // Validate the question
  const validation = validateTrueFalseQuestion(question, isTrue, keyPhrase);
  if (!validation.isValid) {
    return null;
  }

  return {
    type: "true_false",
    question,
    correctAnswer: isTrue,
    metadata: {
      originalStatement: original,
      modification: shouldNegate ? "negated" : "unchanged",
      validation: validation.details,
    },
  };
}

function validateTrueFalseQuestion(question, isTrue, keyPhrase) {
  const validation = {
    isValid: true,
    details: {},
  };

  // Check question length
  if (question.length < 10) {
    return { isValid: false, reason: "Question too short" };
  }

  // Check for ambiguity
  const ambiguousTerms = ["maybe", "sometimes", "possibly", "perhaps"];
  if (ambiguousTerms.some((term) => question.toLowerCase().includes(term))) {
    return { isValid: false, reason: "Question is ambiguous" };
  }

  // Validate against context
  const { context, paragraph } = keyPhrase;
  const combinedContext = [context.previous, context.next, paragraph].join(" ");

  validation.details = {
    hasContext: !!context.previous && !!context.next,
    contextSupport: combinedContext
      .toLowerCase()
      .includes(question.toLowerCase()),
    complexity: question.split(" ").length,
  };

  return validation;
}

function generateFillBlanksQuestion(keyPhrase) {
  const { original, cleaned, properNouns, hasNumbers } = keyPhrase;

  let question = original;
  let answer = "";

  // Try to find the best word to blank out
  if (properNouns.length > 0) {
    // Prefer proper nouns
    answer = properNouns[0];
  } else if (hasNumbers) {
    // Use numbers if available
    answer = original.match(/\d+/)[0];
  } else {
    // Find significant words (nouns, verbs, adjectives)
    const words = cleaned
      .split(" ")
      .filter((w) => w.length > 4)
      .sort((a, b) => b.length - a.length);

    if (words.length > 0) {
      answer = words[0];
    }
  }

  if (!answer) {
    return null;
  }

  // Create the question by replacing the answer with blanks
  question = original.replace(
    new RegExp(answer, "i"),
    "_".repeat(answer.length)
  );

  // Validate the question
  const validation = validateFillBlanksQuestion(question, answer, keyPhrase);
  if (!validation.isValid) {
    return null;
  }

  return {
    type: "fill_blanks",
    question,
    correctAnswer: answer,
    metadata: {
      answerType:
        properNouns.length > 0 ? "proper_noun" : hasNumbers ? "number" : "word",
      validation: validation.details,
    },
  };
}

function validateFillBlanksQuestion(question, answer, keyPhrase) {
  const validation = {
    isValid: true,
    details: {},
  };

  // Check if answer is too short
  if (answer.length < 3) {
    return { isValid: false, reason: "Answer too short" };
  }

  // Check if question provides enough context
  if (question.split(" ").length < 5) {
    return { isValid: false, reason: "Insufficient context" };
  }

  // Validate against original context
  const { context, paragraph } = keyPhrase;
  const combinedContext = [context.previous, context.next, paragraph].join(" ");

  validation.details = {
    answerLength: answer.length,
    contextMatch: combinedContext.toLowerCase().includes(answer.toLowerCase()),
    hasContext: !!context.previous && !!context.next,
  };

  return validation;
}

// Helper function to shuffle arrays
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Update generateQuiz function to use the enhanced logic
async function generateQuiz(text, options) {
  console.log("[Quiz Generator] Analyzing text for key concepts...");
  const keyPhrases = extractKeyPhrases(text);
  const questions = [];
  const types = [];

  if (options.mcq) types.push("mcq");
  if (options.trueFalse) types.push("true_false");
  if (options.fillBlanks) types.push("fill_blanks");

  console.log("[Quiz Generator] Extracted key phrases:", keyPhrases.length);

  // Generate and validate questions
  for (let i = 0; i < options.count && i < keyPhrases.length; i++) {
    const type = types[i % types.length];
    const keyPhrase = keyPhrases[i];

    console.log(
      `[Quiz Generator] Generating ${type} question for phrase:`,
      keyPhrase.original
    );

    let question;
    switch (type) {
      case "mcq":
        question = generateMCQQuestion(keyPhrase);
        break;
      case "true_false":
        question = generateTrueFalseQuestion(keyPhrase);
        break;
      case "fill_blanks":
        question = generateFillBlanksQuestion(keyPhrase);
        break;
    }

    if (question) {
      console.log("[Quiz Generator] Generated valid question:", {
        type: question.type,
        question: question.question,
        metadata: question.metadata,
      });
      questions.push({
        id: i + 1,
        ...question,
      });
    }
  }

  return questions;
}

// UI Update Functions
function updateQuizPreview(questions) {
  if (!questionsList || !answerKey) return;

  // Update questions list
  questionsList.innerHTML = questions
    .map((q) => {
      let optionsHtml = "";

      switch (q.type) {
        case "mcq":
          optionsHtml = `
            <div class="options-list">
              ${q.options
                .map(
                  (opt, idx) => `
                  <div class="option-item">
                    <div class="option-marker">${String.fromCharCode(
                      65 + idx
                    )}</div>
                    <div class="option-text">${opt}</div>
                  </div>
                `
                )
                .join("")}
            </div>
          `;
          break;
        case "true_false":
          optionsHtml = `
            <div class="options-list">
              <div class="option-item">
                <div class="option-marker">T</div>
                <div class="option-text">True</div>
              </div>
              <div class="option-item">
                <div class="option-marker">F</div>
                <div class="option-text">False</div>
              </div>
            </div>
          `;
          break;
        case "fill_blanks":
          optionsHtml = `
            <div class="answer-input">
              <input type="text" placeholder="Type your answer..." disabled>
            </div>
          `;
          break;
      }

      return `
        <div class="question-item">
          <div class="question-header">
            <span class="question-number">Question ${q.id}</span>
            <span class="question-type">${
              q.type === "mcq"
                ? "Multiple Choice"
                : q.type === "true_false"
                ? "True/False"
                : "Fill in the Blanks"
            }</span>
          </div>
          <div class="question-text">${q.question}</div>
          ${optionsHtml}
        </div>
      `;
    })
    .join("");

  // Update answer key
  answerKey.innerHTML = questions
    .map((q) => {
      let answerText = "";
      switch (q.type) {
        case "mcq":
          answerText = q.options[q.correctAnswer];
          break;
        case "true_false":
          answerText = q.correctAnswer ? "True" : "False";
          break;
        case "fill_blanks":
          answerText = q.correctAnswer;
          break;
      }

      return `
        <div class="answer-item">
          <div class="answer-number">${q.id}</div>
          <div class="answer-text">${q.question}</div>
          <div class="correct-answer">${answerText}</div>
        </div>
      `;
    })
    .join("");
}

// Add loading screen functions
function showLoadingScreen(message = "Analyzing content...") {
  if (!loadingScreen || !loadingProgress || !loadingText) return;

  loadingScreen.style.display = "flex";
  loadingProgress.style.width = "0";
  loadingText.textContent = message;

  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 1;
    loadingProgress.style.width = `${progress}%`;

    if (progress === 30) {
      loadingText.textContent = "Generating questions...";
    } else if (progress === 60) {
      loadingText.textContent = "Preparing quiz...";
    } else if (progress === 90) {
      loadingText.textContent = "Almost ready...";
    }

    if (progress >= 100) {
      clearInterval(interval);
    }
  }, 30); // 3 seconds total

  return interval;
}

function hideLoadingScreen() {
  if (!loadingScreen) return;
  loadingScreen.style.display = "none";
}

// Add modal functions
function showExampleModal() {
  if (!exampleModal) return;
  exampleModal.classList.add("show");
}

function hideExampleModal() {
  if (!exampleModal) return;
  exampleModal.classList.remove("show");
}

// Kahoot-style quiz functions
let currentQuestion = 0;
let score = 0;
let timer = null;
let questionTimer = null;

function startQuiz(questions) {
  console.log("[Quiz Generator] Starting quiz with questions:", questions);

  if (!quizMode || !quizContent) {
    console.error("[Quiz Generator] Quiz mode elements not found");
    return;
  }

  currentQuestion = 0;
  score = 0;
  quizMode.classList.add("active");
  quizMode.style.display = "flex";

  if (questions && questions.length > 0) {
    showQuestion(questions[0]);
  } else {
    console.error("[Quiz Generator] No questions available");
    showToast("Error: No questions generated", "error");
  }
}

function showQuestion(question) {
  if (!quizContent || !quizProgress || !quizTimer) return;

  // Update progress and score
  quizProgress.querySelector("span").textContent = `Question ${
    currentQuestion + 1
  }/${lastQuiz.questions.length}`;
  quizScoreDisplay.textContent = `Score: ${score}`;

  // Create question content
  let optionsHtml = "";
  if (question.type === "mcq") {
    optionsHtml = question.options
      .map(
        (opt, idx) => `
          <div class="quiz-option" data-index="${idx}">
            ${opt}
          </div>
        `
      )
      .join("");
  } else if (question.type === "true_false") {
    optionsHtml = `
      <div class="quiz-option" data-index="0">True</div>
      <div class="quiz-option" data-index="1">False</div>
    `;
  } else if (question.type === "fill_blanks") {
    optionsHtml = `
      <div class="fill-blank-container">
        <input type="text" class="fill-blank-input" placeholder="Type your answer here..." autocomplete="off">
        <button class="fill-blank-submit">
          <i class="fas fa-check"></i>
          Submit Answer
        </button>
      </div>
    `;
  }

  quizContent.innerHTML = `
    <div class="quiz-question">
      <h2>${question.question}</h2>
    </div>
    <div class="quiz-options">
      ${optionsHtml}
    </div>
  `;

  // Add event listeners based on question type
  if (question.type === "fill_blanks") {
    const input = quizContent.querySelector(".fill-blank-input");
    const submitBtn = quizContent.querySelector(".fill-blank-submit");

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleFillBlankAnswer(input.value.trim(), question);
      }
    });

    submitBtn.addEventListener("click", () => {
      handleFillBlankAnswer(input.value.trim(), question);
    });
  } else {
    const options = quizContent.querySelectorAll(".quiz-option");
    options.forEach((option) => {
      option.addEventListener("click", (e) => handleAnswer(e, question));
    });
  }

  // Start timer
  let timeLeft = 20;
  quizTimer.textContent = timeLeft;

  // Update timer circle
  if (timerCircle) {
    const circumference = 175.9; // 2 * π * r where r = 28
    timerCircle.style.strokeDasharray = circumference;
    timerCircle.style.strokeDashoffset = 0;
  }

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    quizTimer.textContent = timeLeft;

    // Update timer circle
    if (timerCircle) {
      const circumference = 175.9;
      const offset = circumference - (timeLeft / 20) * circumference;
      timerCircle.style.strokeDashoffset = offset;
    }

    if (timeLeft <= 5) {
      quizTimer.style.color = "var(--error-red)";
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      handleTimeout(question);
    }
  }, 1000);

  // Show skip button for fill in the blank questions
  if (skipBtn) {
    skipBtn.style.display = question.type === "fill_blanks" ? "flex" : "none";
    skipBtn.onclick = () => handleSkip(question);
  }
}

function handleAnswer(e, question) {
  if (timer) clearInterval(timer);

  const selectedIndex = parseInt(e.target.dataset.index);
  const isCorrect =
    question.type === "mcq"
      ? selectedIndex === question.correctAnswer
      : question.type === "true_false"
      ? (selectedIndex === 0) === question.correctAnswer
      : false;

  // Show result
  e.target.classList.add(isCorrect ? "correct" : "incorrect");

  if (isCorrect) {
    score++;
    showToast("Correct!", "success");
  } else {
    showToast("Incorrect!", "error");
  }

  // Wait before next question
  setTimeout(() => {
    currentQuestion++;

    if (currentQuestion < lastQuiz.questions.length) {
      showQuestion(lastQuiz.questions[currentQuestion]);
    } else {
      showResults();
    }
  }, 1500);
}

function handleTimeout(question) {
  showToast("Time's up!", "error");

  setTimeout(() => {
    currentQuestion++;

    if (currentQuestion < lastQuiz.questions.length) {
      showQuestion(lastQuiz.questions[currentQuestion]);
    } else {
      showResults();
    }
  }, 1500);
}

function showResults() {
  if (!quizContent || !quizMode) return;

  const percentage = Math.round((score / lastQuiz.questions.length) * 100);

  quizContent.innerHTML = `
    <div class="quiz-results show">
      <h1 class="results-header">Quiz Complete!</h1>
      <div class="results-score">${percentage}%</div>
      <div class="results-stats">
        <div class="stat-card">
          <div class="stat-label">Correct Answers</div>
          <div class="stat-value">${score}/${lastQuiz.questions.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Time Taken</div>
          <div class="stat-value">${Math.round(
            (lastQuiz.questions.length * 20) / 60
          )} min</div>
        </div>
      </div>
      <button class="action-btn" onclick="location.reload()">
        <i class="fas fa-redo"></i>
        Try Again
      </button>
    </div>
  `;
}

// Add new function to handle fill in the blank answers
function handleFillBlankAnswer(answer, question) {
  if (timer) clearInterval(timer);

  const isCorrect =
    answer.toLowerCase() === question.correctAnswer.toLowerCase();
  const input = document.querySelector(".fill-blank-input");
  const submitBtn = document.querySelector(".fill-blank-submit");

  // Disable input and button
  input.disabled = true;
  submitBtn.disabled = true;

  // Show result
  input.style.borderColor = isCorrect
    ? "var(--success-green)"
    : "var(--error-red)";
  input.style.backgroundColor = isCorrect
    ? "rgba(0, 255, 157, 0.1)"
    : "rgba(255, 78, 78, 0.1)";

  if (isCorrect) {
    score++;
    showToast("Correct!", "success");
  } else {
    showToast(`Incorrect! The answer was: ${question.correctAnswer}`, "error");
  }

  // Wait before next question
  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < lastQuiz.questions.length) {
      showQuestion(lastQuiz.questions[currentQuestion]);
    } else {
      showResults();
    }
  }, 2000);
}

// Add function to handle skipping questions
function handleSkip(question) {
  if (timer) clearInterval(timer);
  showToast(`The answer was: ${question.correctAnswer}`, "info");

  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < lastQuiz.questions.length) {
      showQuestion(lastQuiz.questions[currentQuestion]);
    } else {
      showResults();
    }
  }, 1500);
}

// Event Handlers
async function handleGenerate() {
  console.log("[Quiz Generator] Starting quiz generation...");

  if (isGenerating) {
    console.log("[Quiz Generator] Generation already in progress");
    return;
  }

  const text = textInput.value.trim();
  const { words } = updateCounts();

  console.log(`[Quiz Generator] Word count: ${words}`);

  if (words < MIN_WORDS) {
    showToast(`Please enter at least ${MIN_WORDS} words`, "error");
    return;
  }

  if (words > MAX_WORDS) {
    showToast(`Text exceeds maximum limit of ${MAX_WORDS} words`, "error");
    return;
  }

  if (!currentUser) {
    showToast("Please log in to use the quiz generator", "error");
    return;
  }

  if (!mcqType.checked && !trueFalseType.checked && !fillBlanksType.checked) {
    showToast("Please select at least one question type", "error");
    return;
  }

  try {
    console.log("[Quiz Generator] Starting generation process");
    isGenerating = true;

    // Show loading screen with class
    loadingScreen.classList.add("show");
    loadingProgress.style.width = "0%";
    loadingText.textContent = "Analyzing content...";

    // Simulate progress
    let progress = 0;
    const loadingInterval = setInterval(() => {
      progress += 1;
      if (loadingProgress) {
        loadingProgress.style.width = `${progress}%`;
      }

      if (progress === 30) {
        loadingText.textContent = "Generating questions...";
      } else if (progress === 60) {
        loadingText.textContent = "Preparing quiz...";
      } else if (progress === 90) {
        loadingText.textContent = "Almost ready...";
      }

      if (progress >= 100) {
        clearInterval(loadingInterval);
      }
    }, 30);

    console.log("[Quiz Generator] Generating questions...");
    const questions = await generateQuiz(text, {
      mcq: mcqType.checked,
      trueFalse: trueFalseType.checked,
      fillBlanks: fillBlanksType.checked,
      count: parseInt(questionCount.value),
      difficulty: difficultyLevel.value,
    });

    console.log("[Quiz Generator] Questions generated:", questions);

    lastQuiz = {
      questions,
      timestamp: new Date().toISOString(),
      text,
    };

    // Update loading screen removal
    setTimeout(() => {
      loadingScreen.classList.remove("show");
      console.log("[Quiz Generator] Starting quiz...");
      if (quizMode && quizContent) {
        startQuiz(questions);
      } else {
        console.error("[Quiz Generator] Quiz mode elements not found");
        showToast("Error starting quiz", "error");
      }
    }, 3000);
  } catch (error) {
    console.error("[Quiz Generator] Generation error:", error);
    showToast(error.message || "Error generating quiz", "error");
    loadingScreen.classList.remove("show");
  } finally {
    isGenerating = false;
  }
}

async function handleSave() {
  if (!lastQuiz) return;

  try {
    const timestamp = new Date().toISOString();
    const filename = `quiz_${timestamp}.json`;
    const blob = new Blob([JSON.stringify(lastQuiz, null, 2)], {
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

    showToast("Quiz saved successfully", "success");
  } catch (error) {
    console.error("[Quiz Generator] Error saving quiz:", error);
    showToast("Error saving quiz", "error");
  }
}

async function handleExport() {
  if (!lastQuiz) return;

  try {
    showLoading("Generating PDF...");

    // Create quiz content
    const content = `
      Quiz
      Generated: ${new Date().toLocaleString()}
      
      Questions:
      ${lastQuiz.questions
        .map(
          (q) => `
        ${q.id}. ${q.question}
        ${
          q.type === "mcq"
            ? q.options
                .map(
                  (opt, idx) =>
                    `${String.fromCharCode(65 + idx)}. ${opt}${
                      idx === q.correctAnswer ? " ✓" : ""
                    }`
                )
                .join("\n")
            : q.type === "true_false"
            ? `Answer: ${q.correctAnswer ? "True" : "False"}`
            : `Answer: ${q.correctAnswer}`
        }
      `
        )
        .join("\n")}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideLoading();
    showToast("Quiz exported successfully", "success");
  } catch (error) {
    console.error("[Quiz Generator] Error exporting quiz:", error);
    hideLoading();
    showToast("Error exporting quiz", "error");
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Quiz Generator] Initializing...");

  try {
    initializeDOMElements();

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Auth state observer
    onAuthStateChanged(auth, (user) => {
      console.log(
        "[Quiz Generator] Auth state changed:",
        user ? "logged in" : "logged out"
      );
      currentUser = user;
      if (!user) {
        showToast("Please log in to use the quiz generator", "info");
      }
    });

    // Add event listeners
    if (textInput) {
      textInput.addEventListener("input", updateCounts);
    }

    if (generateBtn) {
      generateBtn.addEventListener("click", handleGenerate);
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", handleSave);
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", handleExport);
    }

    if (showExampleBtn) {
      showExampleBtn.addEventListener("click", showExampleModal);
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", hideExampleModal);
    }

    // Close modal when clicking outside
    if (exampleModal) {
      exampleModal.addEventListener("click", (e) => {
        if (e.target === exampleModal) {
          hideExampleModal();
        }
      });
    }

    // Preview tab switching
    if (previewBtns) {
      previewBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const view = btn.getAttribute("data-view");
          previewBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");

          if (view === "questions") {
            questionsList.style.display = "block";
            answerKey.style.display = "none";
          } else {
            questionsList.style.display = "none";
            answerKey.style.display = "block";
          }
        });
      });
    }

    // Add exit button handler
    if (quizExitBtn) {
      quizExitBtn.addEventListener("click", () => {
        if (
          confirm(
            "Are you sure you want to exit the quiz? Your progress will be lost."
          )
        ) {
          location.reload();
        }
      });
    }

    // Add skip button handler
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        const currentQ = lastQuiz.questions[currentQuestion];
        if (currentQ) {
          handleSkip(currentQ);
        }
      });
    }

    console.log("[Quiz Generator] Initialization complete");
  } catch (error) {
    console.error("[Quiz Generator] Initialization error:", error);
    showToast("Error initializing application", "error");
  }
});
