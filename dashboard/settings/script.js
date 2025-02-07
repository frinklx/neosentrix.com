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
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { firebaseConfig } from "../../shared/utils/firebase-config.js";
import { showToast, showLoading, hideLoading } from "../../shared/utils/ui.js";

// Initialize Firebase
console.log("[Settings] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const elements = {
  displayName: document.getElementById("displayName"),
  nickname: document.getElementById("nickname"),
  bio: document.getElementById("bio"),
  location: document.getElementById("location"),
  expertise: document.getElementById("expertise"),
  interests: document.getElementById("interests"),
  education: document.getElementById("education"),
  website: document.getElementById("website"),
  socialLinks: document.getElementById("socialLinks"),
  newGoal: document.getElementById("newGoal"),
  addGoalBtn: document.getElementById("addGoalBtn"),
  goalsList: document.getElementById("goalsList"),
  saveChanges: document.getElementById("saveChanges"),
  logoutBtn: document.getElementById("logoutBtn"),
  userInitials: document.getElementById("userInitials"),
  profilePicture: document.getElementById("profilePicture"),
  profilePictureInput: document.getElementById("profilePictureInput"),
};

let currentUser = null;
let userProfile = {
  learningGoals: [],
  displayName: "",
  nickname: "",
  bio: "",
  location: "",
  expertise: [],
  interests: [],
  education: "",
  website: "",
  socialLinks: [],
  profilePicture: null,
};

// Initialize event listeners only after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Event Listeners
  if (elements.addGoalBtn) {
    elements.addGoalBtn.addEventListener("click", addNewGoal);
  }

  if (elements.saveChanges) {
    elements.saveChanges.addEventListener("click", saveChanges);
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", handleLogout);
  }

  if (elements.profilePictureInput) {
    elements.profilePictureInput.addEventListener(
      "change",
      handleProfilePictureChange
    );
  }
});

// Auth state observer
onAuthStateChanged(auth, handleAuthStateChange);

async function handleAuthStateChange(user) {
  if (user) {
    currentUser = user;
    await loadUserSettings();
  } else {
    window.location.href =
      "/auth/login?message=Please log in to access settings";
  }
}

async function loadUserSettings() {
  try {
    showLoading("Loading settings...");

    if (!currentUser) {
      console.error("[Settings] No current user found");
      showToast("Please log in to access settings", "error");
      window.location.href = "/auth/login";
      return;
    }

    const settingsDoc = await getDoc(doc(db, "userSettings", currentUser.uid));
    let settings = {};

    if (settingsDoc.exists()) {
      settings = settingsDoc.data();
      userProfile = { ...userProfile, ...settings }; // Update userProfile with settings data
      updateProfileUI();
    } else {
      // Create default settings if none exists
      settings = {
        displayName:
          currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        email: currentUser.email || "",
        nickname: "",
        bio: "",
        location: "",
        expertise: [],
        interests: [],
        education: "",
        website: "",
        socialLinks: [],
        learningGoals: [],
        profilePicture: null,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        userId: currentUser.uid,
      };

      // Save the default settings
      try {
        await setDoc(doc(db, "userSettings", currentUser.uid), settings);
        console.log("[Settings] Created default settings for user");
      } catch (error) {
        console.error("[Settings] Error creating default settings:", error);
        showToast("Failed to create settings", "error");
      }
    }

    // Update UI with settings
    updateUIWithUserData(settings);
    hideLoading();
  } catch (error) {
    console.error("[Settings] Error loading settings:", error);
    showToast("Failed to load settings", "error");
    hideLoading();
  }
}

function updateProfileUI() {
  if (!userProfile) return;

  // Update profile picture or show initials
  if (elements.profilePicture && elements.userInitials) {
    const initials = (userProfile.displayName || userProfile.email || "User")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    if (userProfile.profilePicture) {
      elements.profilePicture.src = userProfile.profilePicture;
      elements.profilePicture.style.display = "block";
      elements.userInitials.style.display = "none";
    } else {
      elements.userInitials.textContent = initials;
      elements.profilePicture.style.display = "none";
      elements.userInitials.style.display = "flex";
    }
  }

  // Update form fields
  if (elements.displayName)
    elements.displayName.value = userProfile.displayName || "";
  if (elements.nickname) elements.nickname.value = userProfile.nickname || "";
  if (elements.bio) elements.bio.value = userProfile.bio || "";
  if (elements.location) elements.location.value = userProfile.location || "";
  if (elements.expertise)
    elements.expertise.value = (userProfile.expertise || []).join(", ");
  if (elements.interests)
    elements.interests.value = (userProfile.interests || []).join(", ");
  if (elements.education)
    elements.education.value = userProfile.education || "";
  if (elements.website) elements.website.value = userProfile.website || "";
  if (elements.socialLinks)
    elements.socialLinks.value = (userProfile.socialLinks || []).join(", ");

  // Update goals list
  updateGoalsList();
}

function updateGoalsList() {
  if (!elements.goalsList || !userProfile?.learningGoals) return;

  elements.goalsList.innerHTML = userProfile.learningGoals
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
  if (!elements.newGoal || !userProfile) return;

  const goalText = elements.newGoal.value.trim();
  if (!goalText) return;

  if (!userProfile.learningGoals) {
    userProfile.learningGoals = [];
  }

  userProfile.learningGoals.push(goalText);
  elements.newGoal.value = "";
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
    const userSettings = {
      displayName: elements.displayName.value.trim(),
      nickname: elements.nickname.value.trim(),
      bio: elements.bio.value.trim(),
      location: elements.location.value.trim(),
      expertise: elements.expertise.value
        .trim()
        .split(",")
        .map((item) => item.trim()),
      interests: elements.interests.value
        .trim()
        .split(",")
        .map((item) => item.trim()),
      education: elements.education.value.trim(),
      website: elements.website.value.trim(),
      socialLinks: elements.socialLinks.value
        .trim()
        .split(",")
        .map((item) => item.trim()),
      learningGoals: userProfile.learningGoals || [],
      profilePicture:
        userProfile.profilePicture || "/assets/images/default-avatar.png",
      lastUpdated: new Date().toISOString(),
      userId: currentUser.uid,
    };

    // Save to both users and userSettings collections
    const batch = writeBatch(db);

    // Update basic info in users collection
    const userRef = doc(db, "users", currentUser.uid);
    batch.update(userRef, {
      displayName: userSettings.displayName,
      nickname: userSettings.nickname,
      profilePicture: userSettings.profilePicture,
      lastUpdated: userSettings.lastUpdated,
    });

    // Update detailed info in userSettings collection
    const settingsRef = doc(db, "userSettings", currentUser.uid);
    batch.set(settingsRef, userSettings, { merge: true });

    // Commit both updates
    await batch.commit();

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

async function handleProfilePictureChange(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    showLoading("Uploading profile picture...");

    // Upload to Firebase Storage
    const storageRef = ref(
      storage,
      `profile_pictures/${currentUser.uid}/${file.name}`
    );
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update Firestore
    await updateDoc(doc(db, "userSettings", currentUser.uid), {
      profilePicture: downloadURL,
      lastUpdated: new Date().toISOString(),
    });

    // Update local state and UI
    userProfile.profilePicture = downloadURL;
    updateProfileUI();
    showToast("Profile picture updated successfully", "success");
  } catch (error) {
    console.error("[Settings] Error updating profile picture:", error);
    showToast("Failed to update profile picture", "error");
  } finally {
    hideLoading();
  }
}

// Update UI with user data
async function updateUIWithUserData(userData) {
  if (!userData) return;

  // Update profile picture or show initials
  if (elements.profilePicture && elements.userInitials) {
    if (
      userData.profilePicture &&
      userData.profilePicture !== "/assets/images/default-avatar.png"
    ) {
      elements.profilePicture.src = userData.profilePicture;
      elements.profilePicture.style.display = "block";
      elements.userInitials.style.display = "none";
    } else {
      const initials = (userData.displayName || userData.email || "User")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      elements.userInitials.textContent = initials;
      elements.profilePicture.style.display = "none";
      elements.userInitials.style.display = "flex";
    }
  }
}

// Add CSS for profile picture styling
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .avatar-container {
    position: relative;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(0, 242, 255, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .avatar-container:hover {
    transform: scale(1.05);
  }

  .avatar-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-container .user-initials {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: #00f2ff;
    background: rgba(0, 242, 255, 0.1);
  }

  .avatar-container .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .avatar-container:hover .overlay {
    opacity: 1;
  }

  .avatar-container .overlay i {
    color: white;
    font-size: 2rem;
  }
`;
document.head.appendChild(styleSheet);
