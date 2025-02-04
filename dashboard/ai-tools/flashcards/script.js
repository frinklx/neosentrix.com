// Import Firebase and utils
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../../../shared/utils/firebase-config.js";
import {
  showToast,
  showLoading,
  hideLoading,
} from "../../../shared/utils/ui.js";

// Initialize Firebase
console.log("[Flashcards] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// DOM Elements
const notesInput = document.getElementById("notesInput");
const formatBtn = document.querySelector(".format-btn");
const generateBtn = document.querySelector(".generate-btn");
const flashcardsWrapper = document.querySelector(".flashcards-wrapper");
const prevBtn = document.getElementById("prevCard");
const nextBtn = document.getElementById("nextCard");
const cardCounter = document.getElementById("cardCounter");

// State
let currentCards = [];
let currentCardIndex = 0;
let currentUser = null;

// Card Types and their icons
const CARD_TYPES = {
  definition: { icon: "fa-book", label: "Definition" },
  "fill-in": { icon: "fa-pencil", label: "Fill in the Blank" },
  topic: { icon: "fa-folder", label: "Topic Overview" },
  concept: { icon: "fa-lightbulb", label: "Key Concept" },
  application: { icon: "fa-puzzle-piece", label: "Application" },
  relationship: { icon: "fa-link", label: "Relationship" },
  "reverse-definition": { icon: "fa-rotate", label: "Reverse Definition" },
};

// Helper Functions
function parseNotes(notes) {
  const sections = notes.split(/\n(?=Topic:|Definition:|Example:)/g);
  const parsed = [];
  let currentTopic = "";

  sections.forEach((section) => {
    section = section.trim();
    if (!section) return;

    if (section.startsWith("Topic:")) {
      currentTopic = section.replace("Topic:", "").trim();
      const points = section
        .split("\n")
        .slice(1)
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().replace("-", "").trim());

      if (points.length > 0) {
        parsed.push({
          type: "topic",
          topic: currentTopic,
          points,
        });
      }
    } else if (section.startsWith("Definition:")) {
      const [term, ...points] = section.split("\n");
      const definition = points
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().replace("-", "").trim())
        .join("\n");

      if (definition) {
        parsed.push({
          type: "definition",
          topic: currentTopic,
          term: term.replace("Definition:", "").trim(),
          definition,
        });
      }
    } else if (section.startsWith("Example:")) {
      const points = section
        .split("\n")
        .slice(1)
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().replace("-", "").trim());

      if (points.length > 0) {
        parsed.push({
          type: "example",
          topic: currentTopic,
          examples: points,
        });
      }
    }
  });

  return parsed;
}

function generateFlashcards(parsedNotes) {
  const cards = [];

  parsedNotes.forEach((note) => {
    switch (note.type) {
      case "definition":
        // Standard definition card
        cards.push({
          type: "definition",
          front: `What is ${note.term}?`,
          back: note.definition,
        });

        // Reverse definition card
        cards.push({
          type: "reverse-definition",
          front: note.definition.split("\n")[0],
          back: note.term,
        });

        // Fill in the blank cards
        const terms = note.definition.match(/\b\w+\b/g) || [];
        const significantTerms = terms.filter(
          (term) =>
            term.length > 4 &&
            !["which", "what", "that", "this", "with"].includes(
              term.toLowerCase()
            )
        );

        if (significantTerms.length > 0) {
          const term =
            significantTerms[
              Math.floor(Math.random() * significantTerms.length)
            ];
          const blank = "_".repeat(term.length);
          cards.push({
            type: "fill-in",
            front: note.definition.replace(new RegExp(term, "i"), blank),
            back: term,
          });
        }
        break;

      case "topic":
        // Topic overview card
        cards.push({
          type: "topic",
          front: `What are the key points about ${note.topic}?`,
          back: note.points.join("\n"),
        });

        // Concept cards for each point
        note.points.forEach((point) => {
          cards.push({
            type: "concept",
            front: `Regarding ${note.topic}: ${point}?`,
            back: point,
          });
        });

        // Relationship card
        if (note.points.length > 1) {
          cards.push({
            type: "relationship",
            front: `How are the following concepts related in ${
              note.topic
            }?\n\n${note.points.slice(0, 2).join("\n")}`,
            back: `Both concepts are aspects of ${
              note.topic
            } that ${note.points.slice(2, 3)}`,
          });
        }
        break;

      case "example":
        // Application cards
        note.examples.forEach((example) => {
          cards.push({
            type: "application",
            front: `Give an example of ${note.topic}:`,
            back: example,
          });
        });
        break;
    }
  });

  return shuffleArray(cards);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createFlashcardElement(cardData) {
  const card = document.createElement("div");
  card.className = "flashcard";
  card.setAttribute("data-type", cardData.type);

  const front = document.createElement("div");
  front.className = "flashcard-front";

  const cardType = document.createElement("div");
  cardType.className = "card-type";
  cardType.innerHTML = `
    <i class="fas ${CARD_TYPES[cardData.type].icon}"></i>
    ${CARD_TYPES[cardData.type].label}
  `;

  const frontContent = document.createElement("p");
  frontContent.textContent = cardData.front;

  front.appendChild(cardType);
  front.appendChild(frontContent);

  const back = document.createElement("div");
  back.className = "flashcard-back";

  const backContent = document.createElement("p");
  backContent.textContent = cardData.back;

  back.appendChild(backContent);

  card.appendChild(front);
  card.appendChild(back);

  return card;
}

function updateCardDisplay() {
  if (currentCards.length === 0) {
    flashcardsWrapper.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-lightbulb"></i>
        <p>No flashcards yet</p>
        <span>Paste your notes and click Generate to create flashcards</span>
      </div>
    `;
    cardCounter.textContent = "0 / 0";
    return;
  }

  // Remove empty state if it exists
  const emptyState = flashcardsWrapper.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  // Remove any existing cards
  const existingCard = flashcardsWrapper.querySelector(".flashcard");
  if (existingCard) {
    existingCard.remove();
  }

  // Create and add new card
  const card = createFlashcardElement(currentCards[currentCardIndex]);
  flashcardsWrapper.appendChild(card);

  // Add active class after a brief delay to trigger transition
  requestAnimationFrame(() => {
    card.classList.add("active");
  });

  cardCounter.textContent = `${currentCardIndex + 1} / ${currentCards.length}`;
}

// Event Listeners
formatBtn.addEventListener("click", () => {
  const notes = notesInput.value;
  if (!notes.trim()) return;

  // Format the notes with proper spacing and structure
  const formattedNotes = notes
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^-\s*/gm, "- ")
    .replace(/^(Topic|Definition|Example):/gm, "\n$1:")
    .trim();

  notesInput.value = formattedNotes;
});

generateBtn.addEventListener("click", async () => {
  try {
    if (!auth.currentUser) {
      showToast("Please log in to create flashcards", "error");
      return;
    }

    showLoading("Generating flashcards...");
    const notes = notesInput.value;
    if (!notes.trim()) {
      showToast("Please enter some notes first", "error");
      return;
    }

    const parsedNotes = parseNotes(notes);
    currentCards = generateFlashcards(parsedNotes);

    if (currentCards.length > 0) {
      // Save to Firestore first
      const saved = await saveFlashcards(currentCards);
      if (saved) {
        currentCardIndex = 0;
        updateCardDisplay();
      }
    }
  } catch (error) {
    console.error("[Flashcards] Error generating flashcards:", error);
    showToast("Failed to generate flashcards. Please try again.", "error");
  } finally {
    hideLoading();
  }
});

prevBtn.addEventListener("click", () => {
  if (currentCards.length === 0) return;
  currentCardIndex =
    (currentCardIndex - 1 + currentCards.length) % currentCards.length;
  updateCardDisplay();
});

nextBtn.addEventListener("click", () => {
  if (currentCards.length === 0) return;
  currentCardIndex = (currentCardIndex + 1) % currentCards.length;
  updateCardDisplay();
});

flashcardsWrapper.addEventListener("click", (e) => {
  const card = e.target.closest(".flashcard");
  if (card) {
    card.classList.toggle("flipped");
  }
});

// Initialize
updateCardDisplay();

async function saveFlashcards(cards) {
  try {
    if (!auth.currentUser) {
      showToast("Please log in to save flashcards", "error");
      return false;
    }

    const flashcardsRef = collection(firestore, "flashcards");
    const newFlashcardSet = {
      userId: auth.currentUser.uid,
      cards: cards,
      timestamp: new Date().getTime(),
      studyTime: cards.length * 2, // Estimate 2 minutes per card for initial creation
    };

    await addDoc(flashcardsRef, newFlashcardSet);
    showToast("Flashcards saved successfully!", "success");
    return true;
  } catch (error) {
    console.error("[Flashcards] Error saving flashcards:", error);
    showToast("Failed to save flashcards. Please try again.", "error");
    return false;
  }
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    // Optionally redirect to login page or show login prompt
    showToast("Please log in to use flashcards", "info");
  }
});
