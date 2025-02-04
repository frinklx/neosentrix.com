// Import Firebase and utils
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
  updateDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../../shared/utils/firebase-config.js";
import { showToast, showLoading, hideLoading } from "../../shared/utils/ui.js";

// Initialize Firebase
console.log("[Settings] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// DOM Elements
const displayNameInput = document.getElementById("displayName");
const nicknameInput = document.getElementById("nickname");
const bioInput = document.getElementById("bio");
const newGoalInput = document.getElementById("newGoal");
const addGoalBtn = document.getElementById("addGoalBtn");
const goalsList = document.getElementById("goalsList");
const saveChangesBtn = document.getElementById("saveChanges");
const logoutBtn = document.getElementById("logoutBtn");
const userInitials = document.getElementById("userInitials");

let currentUser = null;
let userProfile = null;

// Event Listeners
addGoalBtn.addEventListener("click", addNewGoal);
saveChangesBtn.addEventListener("click", saveChanges);
logoutBtn.addEventListener("click", handleLogout);

// Initialize
onAuthStateChanged(auth, handleAuthStateChange);

async function handleAuthStateChange(user) {
  if (!user) {
    window.location.href =
      "/auth/login?message=Please log in to access settings";
    return;
  }

  currentUser = user;
  await loadUserProfile();
}

async function loadUserProfile() {
  try {
    showLoading("Loading profile...");

    if (!currentUser) {
      console.error("[Settings] No current user found");
      showToast("Please log in to access settings", "error");
      window.location.href = "/auth/login";
      return;
    }

    const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));

    if (!userDoc.exists()) {
      // Create default profile if none exists
      userProfile = {
        displayName:
          currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        email: currentUser.email || "",
        nickname: "",
        bio: "",
        learningGoals: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      // Save the default profile
      try {
        await setDoc(doc(firestore, "users", currentUser.uid), userProfile);
        console.log("[Settings] Created default profile for user");
      } catch (error) {
        console.error("[Settings] Error creating default profile:", error);
        showToast("Failed to create profile", "error");
      }
    } else {
      userProfile = userDoc.data();
    }

    // Update UI with profile data
    updateProfileUI();
    hideLoading();
  } catch (error) {
    console.error("[Settings] Error loading profile:", error);
    showToast("Failed to load profile", "error");
    hideLoading();
  }
}

function updateProfileUI() {
  // Update user initials with proper null checks
  let displayName = userProfile?.displayName;
  let email = userProfile?.email;

  let initialsSource = displayName || email || "User";
  if (initialsSource.includes("@")) {
    initialsSource = initialsSource.split("@")[0];
  }

  const initials = initialsSource
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  userInitials.textContent = initials;

  // Update form fields with null checks
  displayNameInput.value = userProfile?.displayName || "";
  nicknameInput.value = userProfile?.nickname || "";
  bioInput.value = userProfile?.bio || "";

  // Update goals list with null check
  updateGoalsList();
}

function updateGoalsList() {
  const goals = userProfile?.learningGoals || [];
  goalsList.innerHTML = goals
    .map(
      (goal, index) => `
    <div class="goal-item">
      <span class="goal-text">${goal}</span>
      <div class="goal-actions">
        <button onclick="editGoal(${index})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-goal" onclick="deleteGoal(${index})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

function addNewGoal() {
  const goalText = newGoalInput.value.trim();
  if (!goalText) return;

  if (!userProfile.learningGoals) {
    userProfile.learningGoals = [];
  }

  userProfile.learningGoals.push(goalText);
  newGoalInput.value = "";
  updateGoalsList();
}

// Make these functions available globally for the onclick handlers
window.editGoal = function (index) {
  const goals = userProfile?.learningGoals || [];
  if (index >= 0 && index < goals.length) {
    const newText = prompt("Edit goal:", goals[index]);
    if (newText && newText.trim()) {
      goals[index] = newText.trim();
      updateGoalsList();
    }
  }
};

window.deleteGoal = function (index) {
  const goals = userProfile?.learningGoals || [];
  if (index >= 0 && index < goals.length) {
    if (confirm("Are you sure you want to delete this goal?")) {
      goals.splice(index, 1);
      updateGoalsList();
    }
  }
};

async function saveChanges() {
  try {
    showLoading("Saving changes...");

    // Update profile object with form values
    userProfile.displayName = displayNameInput.value.trim();
    userProfile.nickname = nicknameInput.value.trim();
    userProfile.bio = bioInput.value.trim();
    userProfile.lastUpdated = new Date().toISOString();

    // Save to Firestore
    await updateDoc(doc(firestore, "users", currentUser.uid), userProfile);
    showToast("Changes saved successfully", "success");
  } catch (error) {
    console.error("[Settings] Error saving changes:", error);
    showToast("Failed to save changes", "error");
  } finally {
    hideLoading();
  }
}

async function handleLogout() {
  try {
    showLoading("Logging out...");
    await signOut(auth);
    window.location.href = "/auth/login?message=Logged out successfully";
  } catch (error) {
    console.error("[Settings] Error during logout:", error);
    showToast("Failed to log out", "error");
    hideLoading();
  }
}
