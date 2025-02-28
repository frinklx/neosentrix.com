import { showToast, showLoading, hideLoading } from "../shared/utils/ui.js";
import { redirectTo } from "../shared/utils/routes.js";

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth;
let firestore;
let currentUser = null;
let authInitialized = false;
let isProcessingAuth = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Dashboard] DOM Content Loaded - Initializing");
  showLoading("Securing your dashboard...", "Checking authentication status");
  initializeFirebase();
  setupEventListeners();
});

async function initializeFirebase() {
  console.log("[Dashboard] Initializing Firebase");
  try {
    const { default: firebaseConfig } = await import(
      "../shared/utils/firebase-config.js"
    );
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);

    onAuthStateChanged(auth, handleAuthStateChange);
    console.log("[Dashboard] Firebase initialized successfully");
  } catch (error) {
    console.error("[Dashboard] Error initializing Firebase:", error);
    showToast("Failed to initialize security features", "error");
  }
}

async function handleAuthStateChange(user) {
  console.log("[Dashboard] Auth state changed, processing:", isProcessingAuth);

  if (isProcessingAuth) {
    console.log("[Dashboard] Already processing auth, skipping");
    return;
  }

  try {
    isProcessingAuth = true;

    if (!user) {
      console.log("[Dashboard] No user found, redirecting to login");
      window.location.href =
        "/redirect/index.html?to=/auth/login&message=Please log in&submessage=Redirecting to login page...";
      return;
    }

    console.log("[Dashboard] User found, checking Firestore data");
    const userDoc = await getDoc(doc(firestore, "users", user.uid));

    if (!userDoc.exists()) {
      console.log(
        "[Dashboard] User document not found, redirecting to continue signup"
      );
      window.location.href =
        "/redirect/index.html?to=/auth/signup/continue.html&message=Complete your profile&submessage=Setting up your account...";
      return;
    }

    const userData = userDoc.data();
    console.log("[Dashboard] User data retrieved:", {
      ...userData,
      uid: user.uid,
    });

    if (!userData.isOnboardingComplete) {
      console.log("[Dashboard] Onboarding incomplete, redirecting");
      window.location.href =
        "/redirect/index.html?to=/onboarding&message=Complete onboarding&submessage=Setting up your workspace...";
      return;
    }

    // User is authenticated and has completed onboarding
    console.log("[Dashboard] User fully authenticated and onboarded");
    hideLoading();
    updateUIWithUserData(userData);
    currentUser = user;
  } catch (error) {
    console.error("[Dashboard] Error in auth state change:", error);
    showToast("Failed to verify your access", "error");
    window.location.href =
      "/redirect/index.html?to=/auth/login&message=Authentication error&submessage=Please try logging in again...";
  } finally {
    isProcessingAuth = false;
  }
}

function updateUIWithUserData(userData) {
  console.log("[Dashboard] Updating UI with user data");
  const userNameElement = document.getElementById("userName");
  const userEmailElement = document.getElementById("userEmail");

  if (userNameElement)
    userNameElement.textContent =
      userData.displayName || userData.email.split("@")[0];
  if (userEmailElement) userEmailElement.textContent = userData.email;

  // Update avatar
  const avatarElement = document.getElementById("userAvatar");
  if (avatarElement) {
    console.log("[Dashboard] Updating avatar source");
    const avatarSrc =
      userData.photoURL ||
      "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(userData.email.split("@")[0]) +
        "&background=00f2ff&color=000000";
    avatarElement.src = avatarSrc;
    console.log("[Dashboard] Updated avatar source:", avatarSrc);
  }
}

function setupEventListeners() {
  console.log("[Dashboard] Setting up event listeners");

  // Logout button
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
    console.log("[Dashboard] Logout button listener added");
  } else {
    console.warn("[Dashboard] Logout button not found in DOM");
  }

  // Handle browser back button
  window.addEventListener("popstate", () => {
    console.log("[Dashboard] Popstate event detected - checking auth state");
    checkAuthState();
  });
}

async function checkAuthState() {
  console.log("[Dashboard] Checking auth state");
  const user = auth.currentUser;
  console.log(
    "[Dashboard] Current user in auth check:",
    user ? "Present" : "Not present"
  );

  if (!user) {
    console.log("[Dashboard] No user in auth check - redirecting to login");
    redirectTo("/auth/login");
  }
}

async function handleLogout() {
  console.log("[Dashboard] Handling logout");
  try {
    showLoading("Logging out...", "Please wait");
    await signOut(auth);
    console.log("[Dashboard] Logout successful");
    window.location.href =
      "/redirect/index.html?to=/auth/login&message=Logged out successfully&submessage=See you soon!";
  } catch (error) {
    console.error("[Dashboard] Error during logout:", error);
    showToast("Failed to log out", "error");
    hideLoading();
  }
}

// Flashcard System
class FlashcardSystem {
  constructor() {
    this.flashcards = [];
    this.currentCardIndex = 0;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const formatBtn = document.getElementById("formatNotes");
    const generateBtn = document.getElementById("generateFlashcards");
    const prevBtn = document.getElementById("prevCard");
    const nextBtn = document.getElementById("nextCard");

    formatBtn.addEventListener("click", () => this.formatNotes());
    generateBtn.addEventListener("click", () => this.generateFlashcards());
    prevBtn.addEventListener("click", () => this.showPreviousCard());
    nextBtn.addEventListener("click", () => this.showNextCard());
  }

  formatNotes() {
    const notesInput = document.getElementById("notesInput");
    const notes = notesInput.value.trim();

    if (!notes) {
      showToast("Please enter some notes first!", "error");
      return;
    }

    // Split into paragraphs
    const paragraphs = notes.split(/\n\s*\n/);

    let formattedNotes = [];
    let currentTopic = null;

    for (let paragraph of paragraphs) {
      paragraph = paragraph.trim();

      // Skip empty paragraphs
      if (!paragraph) continue;

      // Check if it's a new topic
      if (
        !paragraph.startsWith("Topic:") &&
        !paragraph.startsWith("Definition:") &&
        !paragraph.startsWith("Example:") &&
        !paragraph.startsWith("-")
      ) {
        // If it's a regular paragraph, make it a topic
        paragraph = "Topic: " + paragraph;
      }

      // Add proper formatting
      if (paragraph.startsWith("Topic:")) {
        currentTopic = paragraph;
        formattedNotes.push("\n" + paragraph);
      } else if (paragraph.startsWith("Definition:")) {
        formattedNotes.push(paragraph);
      } else if (paragraph.startsWith("Example:")) {
        formattedNotes.push(paragraph);
      } else {
        // Convert regular text into bullet points if not already
        const lines = paragraph.split("\n");
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          if (!line.startsWith("-")) {
            line = "- " + line;
          }
          formattedNotes.push(line);
        }
      }
    }

    notesInput.value = formattedNotes.join("\n");
    showToast("Notes formatted successfully!", "success");
  }

  async generateFlashcards() {
    const notesInput = document.getElementById("notesInput").value.trim();
    if (!notesInput) {
      showToast("Please enter some notes first!", "error");
      return;
    }

    const generateBtn = document.getElementById("generateFlashcards");
    generateBtn.disabled = true;
    generateBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
      const sections = this.parseNotes(notesInput);
      this.flashcards = this.createFlashcards(sections);

      if (this.flashcards.length === 0) {
        showToast(
          "Couldn't generate flashcards. Please check your note format.",
          "error"
        );
        return;
      }

      this.currentCardIndex = 0;
      this.displayCurrentCard();
      document.querySelector(".flashcard-controls").style.display = "flex";
      showToast(`Generated ${this.flashcards.length} flashcards!`, "success");
    } catch (error) {
      console.error("Error generating flashcards:", error);
      showToast("Error generating flashcards. Please try again.", "error");
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML =
        '<i class="fas fa-magic"></i> Generate Flashcards';
    }
  }

  parseNotes(notes) {
    const lines = notes.split("\n");
    const sections = [];
    let currentSection = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith("Topic:")) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          topic: line.replace("Topic:", "").trim(),
          definitions: [],
          points: [],
          examples: [],
        };
      } else if (line.startsWith("Definition:")) {
        if (currentSection) {
          currentSection.definitions.push(
            line.replace("Definition:", "").trim()
          );
        }
      } else if (line.startsWith("Example:")) {
        if (currentSection) {
          currentSection.examples.push(line.replace("Example:", "").trim());
        }
      } else if (line.startsWith("-")) {
        if (currentSection) {
          currentSection.points.push(line.replace("-", "").trim());
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  createFlashcards(sections) {
    const flashcards = [];

    for (const section of sections) {
      // Helper function to check if a string contains the answer
      const containsAnswer = (text, answer) => {
        const words = text.toLowerCase().split(/\W+/);
        return words.includes(answer.toLowerCase());
      };

      // Helper function to remove answer from text
      const removeAnswerFromText = (text, answer) => {
        const regex = new RegExp(answer, "gi");
        return text.replace(regex, "_____");
      };

      // Helper function to get key terms from a text
      const getKeyTerms = (text) => {
        const words = text.split(/\W+/).filter((word) => word.length > 3);
        const commonWords = new Set([
          "what",
          "which",
          "where",
          "when",
          "why",
          "how",
          "this",
          "that",
          "these",
          "those",
          "there",
          "their",
          "they",
          "have",
          "been",
          "were",
          "from",
          "with",
          "will",
        ]);
        return words.filter((word) => !commonWords.has(word.toLowerCase()));
      };

      // Create topic-based questions
      const topicTerms = getKeyTerms(section.topic);
      if (topicTerms.length > 0) {
        flashcards.push({
          question: `What is the main concept that involves ${topicTerms
            .slice(1)
            .join(", ")}?`,
          answer: section.topic,
          type: "topic",
        });
      }

      // Process definitions
      for (const def of section.definitions) {
        const terms = getKeyTerms(def);
        const keyTerm = terms[0];

        if (keyTerm && !containsAnswer(def, section.topic)) {
          flashcards.push({
            question: `Define this term related to ${
              section.topic
            }:\n${removeAnswerFromText(def, keyTerm)}`,
            answer: keyTerm,
            type: "definition",
          });
        }

        // Create reverse question
        flashcards.push({
          question: `Which concept is defined as: "${def}"?`,
          answer: section.topic,
          type: "reverse-definition",
        });
      }

      // Process key points
      for (const point of section.points) {
        const terms = getKeyTerms(point);

        if (terms.length >= 2) {
          // Don't create cards if the point contains the topic or definition
          if (!containsAnswer(point, section.topic)) {
            // Create conceptual understanding questions
            flashcards.push({
              question: `In the context of ${section.topic}, explain why:\n${point}`,
              answer: `This explains how ${
                section.topic
              } works because it demonstrates the relationship between ${terms
                .slice(0, 2)
                .join(" and ")}.`,
              type: "concept",
            });

            // Create fill-in-blank without revealing key terms
            const keyTerm = terms[Math.floor(terms.length / 2)];
            if (keyTerm && keyTerm.length > 3) {
              const questionText = removeAnswerFromText(point, keyTerm);
              if (!containsAnswer(questionText, keyTerm)) {
                flashcards.push({
                  question: `Complete this statement about ${section.topic}:\n${questionText}`,
                  answer: keyTerm,
                  type: "fill-in",
                });
              }
            }
          }
        }
      }

      // Process examples
      for (const example of section.examples) {
        if (!containsAnswer(example, section.topic)) {
          // Create application-based questions
          flashcards.push({
            question: `How does this example demonstrate ${section.topic}?\n${example}`,
            answer: `This example shows ${
              section.topic
            } because it illustrates ${getKeyTerms(example)
              .slice(0, 2)
              .join(" and ")}.`,
            type: "application",
          });
        }
      }

      // Create relationship questions between points
      if (section.points.length >= 2) {
        const point1 = section.points[0];
        const point2 = section.points[1];
        flashcards.push({
          question: `How are these two aspects of ${section.topic} related?\n1. ${point1}\n2. ${point2}`,
          answer: `Both points describe different aspects of ${
            section.topic
          } and are connected through ${
            getKeyTerms(point1)[0] || "the concept"
          }.`,
          type: "relationship",
        });
      }
    }

    // Filter out duplicate or similar questions
    const uniqueFlashcards = this.removeDuplicateCards(flashcards);

    // Sort by complexity and shuffle within same complexity level
    return this.sortAndShuffleCards(uniqueFlashcards);
  }

  removeDuplicateCards(cards) {
    const seen = new Set();
    return cards.filter((card) => {
      const key = `${card.question}-${card.answer}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  sortAndShuffleCards(cards) {
    // Define complexity levels for different card types
    const complexityOrder = {
      definition: 1,
      "fill-in": 2,
      topic: 3,
      "reverse-definition": 4,
      concept: 5,
      application: 6,
      relationship: 7,
    };

    // Sort by complexity
    cards.sort((a, b) => complexityOrder[a.type] - complexityOrder[b.type]);

    // Shuffle within same complexity level
    let currentType = cards[0]?.type;
    let startIndex = 0;

    for (let i = 1; i <= cards.length; i++) {
      if (i === cards.length || cards[i]?.type !== currentType) {
        // Shuffle the subarray of the same type
        this.shuffleArrayRange(cards, startIndex, i - 1);
        if (i < cards.length) {
          currentType = cards[i].type;
          startIndex = i;
        }
      }
    }

    return cards;
  }

  shuffleArrayRange(array, start, end) {
    for (let i = end; i > start; i--) {
      const j = Math.floor(Math.random() * (i - start + 1)) + start;
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  displayCurrentCard() {
    const container = document.getElementById("flashcardsContainer");
    const counter = document.getElementById("cardCounter");

    container.innerHTML = "";

    if (this.flashcards.length === 0) {
      container.innerHTML = "<p>No flashcards generated yet.</p>";
      return;
    }

    const card = this.flashcards[this.currentCardIndex];
    const flashcardElement = document.createElement("div");
    flashcardElement.className = "flashcard";

    // Add card type indicator
    const cardTypeLabel = this.getCardTypeLabel(card.type);

    flashcardElement.innerHTML = `
      <div class="flashcard-front">
        <div class="card-type">${cardTypeLabel}</div>
        <p>${card.question}</p>
      </div>
      <div class="flashcard-back">
        <p>${card.answer}</p>
      </div>
    `;

    flashcardElement.addEventListener("click", () => {
      flashcardElement.classList.toggle("flipped");
    });

    container.appendChild(flashcardElement);
    counter.textContent = `Card ${this.currentCardIndex + 1} of ${
      this.flashcards.length
    }`;
  }

  getCardTypeLabel(type) {
    const labels = {
      definition: '<i class="fas fa-book"></i> Definition',
      "fill-in": '<i class="fas fa-puzzle-piece"></i> Fill in the Blank',
      topic: '<i class="fas fa-lightbulb"></i> Concept',
      "reverse-definition": '<i class="fas fa-sync"></i> Reverse Definition',
      concept: '<i class="fas fa-brain"></i> Understanding',
      application: '<i class="fas fa-vial"></i> Application',
      relationship: '<i class="fas fa-project-diagram"></i> Relationship',
    };
    return labels[type] || "";
  }

  showNextCard() {
    if (this.currentCardIndex < this.flashcards.length - 1) {
      this.currentCardIndex++;
      this.displayCurrentCard();
    }
  }

  showPreviousCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.displayCurrentCard();
    }
  }
}

// Initialize the flashcard system
const flashcardSystem = new FlashcardSystem();
