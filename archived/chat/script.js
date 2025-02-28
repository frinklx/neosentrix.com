// Import Firebase and utils
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { firebaseConfig } from "../../shared/utils/firebase-config.js";
import { showToast } from "../../shared/utils/ui.js";

// Initialize Firebase
console.log("[Chat] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
let userAvatar;
let userInitials;
let messagesContainer;
let messageInput;
let sendBtn;
let attachmentBtn;
let fileInput;
let emojiBtn;
let emojiPicker;
let typingIndicator;
let attachmentPreview;
let onlineUsersAvatars;
let onlineCountElement;

// State
let currentUser = null;
let selectedFiles = [];
let isTyping = false;
let typingTimeout;
let onlineUsers = new Set();
let messageObserver;
let userProfileCache = new Map();
let emojiData = null;

// Constants
const MESSAGE_LIMIT = 50;
const TYPING_TIMEOUT = 3000;
const MESSAGE_EXPIRY_DAYS = 14;

// Chat Settings
const chatSettings = {
  theme: "default",
  background: "default",
  bubbleStyle: "default",
  notificationSound: true,
  soundEffects: true,
  messagePreview: true,
  readReceipts: true,
  onlineStatus: true,
  messageRetention: "30d",
  fontSize: "medium",
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Chat] DOM Content Loaded");
  initializeDOMElements();
  initializeEventListeners();
  loadEmojiData();
  initializeNewFeatures();
});

// Initialize DOM Elements
function initializeDOMElements() {
  userAvatar = document.getElementById("userAvatar");
  userInitials = document.getElementById("userInitials");
  messagesContainer = document.getElementById("messagesContainer");
  messageInput = document.getElementById("messageInput");
  sendBtn = document.getElementById("sendBtn");
  attachmentBtn = document.getElementById("attachmentBtn");
  fileInput = document.getElementById("fileInput");
  emojiBtn = document.getElementById("emojiBtn");
  emojiPicker = document.getElementById("emojiPicker");
  typingIndicator = document.getElementById("typingIndicator");
  attachmentPreview = document.getElementById("attachmentPreview");
  onlineUsersAvatars = document.getElementById("onlineUsersAvatars");
  onlineCountElement = document.getElementById("onlineCount");
}

// Initialize Event Listeners
function initializeEventListeners() {
  messageInput.addEventListener("input", handleInput);
  messageInput.addEventListener("keypress", handleKeyPress);
  sendBtn.addEventListener("click", handleSend);
  attachmentBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelect);
  emojiBtn.addEventListener("click", toggleEmojiPicker);
  document.addEventListener("click", handleClickOutside);
}

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists()
        ? userDoc.data()
        : { email: user.email };
      updateUIWithUserData({ ...userData, ...user });
      initializeChat();
      updateOnlineStatus(true);
    } catch (error) {
      console.error("[Chat] Error fetching user data:", error);
      showToast("Failed to load user data", "error");
    }
  } else {
    window.location.href = "/auth/login?message=Please log in to access chat";
  }
});

// Update UI with user data
function updateUIWithUserData(userData) {
  if (!userData) return;

  if (userAvatar && userInitials) {
    if (userData.profilePicture) {
      userAvatar.src = userData.profilePicture;
      userAvatar.style.display = "block";
      userInitials.style.display = "none";
    } else {
      const initialsSource = userData.displayName || userData.email || "User";
      const initials = initialsSource
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      userInitials.textContent = initials;
      userAvatar.style.display = "none";
      userInitials.style.display = "flex";
    }
  }
}

// Initialize Chat
function initializeChat() {
  subscribeToMessages();
  subscribeToOnlineUsers();
  setupMessageDeletion();
}

// Subscribe to messages
function subscribeToMessages() {
  if (messageObserver) {
    messageObserver();
  }

  const messagesQuery = query(
    collection(db, "messages"),
    orderBy("timestamp", "desc"),
    limit(MESSAGE_LIMIT)
  );

  messageObserver = onSnapshot(messagesQuery, async (snapshot) => {
    const changes = snapshot.docChanges();
    for (const change of changes) {
      if (change.type === "added") {
        await handleNewMessage(change.doc);
      } else if (change.type === "modified") {
        updateMessage(change.doc);
      } else if (change.type === "removed") {
        removeMessage(change.doc.id);
      }
    }
    scrollToBottom();
  });
}

// Handle new message
async function handleNewMessage(doc) {
  console.log("[Chat] Handling new message:", { id: doc.id, data: doc.data() });
  const messageData = doc.data();
  const messageElement = await createMessageElement(doc.id, messageData);

  // Append to bottom instead of top
  messagesContainer.appendChild(messageElement);
  scrollToBottom();
  console.log("[Chat] Message added to container");
}

// Create message element
async function createMessageElement(messageId, messageData) {
  const template = document.getElementById("messageTemplate");
  const messageElement = template.content
    .cloneNode(true)
    .querySelector(".message");
  messageElement.dataset.id = messageId;

  // Add own-message class if the message is from the current user
  if (messageData.userId === auth.currentUser.uid) {
    messageElement.classList.add("own-message");
  }

  const author = await getUserProfile(messageData.userId);
  const avatar = messageElement.querySelector(".message-avatar");
  const authorName = messageElement.querySelector(".message-author");
  const messageTime = messageElement.querySelector(".message-time");
  const messageText = messageElement.querySelector(".message-text");
  const attachmentsContainer = messageElement.querySelector(
    ".message-attachments"
  );

  // Set author info
  if (author.profilePicture) {
    avatar.querySelector("img").src = author.profilePicture;
    avatar.querySelector(".user-initials").style.display = "none";
  } else {
    const initials = (author.displayName || author.email || "User")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    avatar.querySelector("img").style.display = "none";
    avatar.querySelector(".user-initials").textContent = initials;
  }

  // Set author name (show "You" for own messages)
  authorName.textContent =
    messageData.userId === auth.currentUser.uid
      ? "You"
      : author.displayName || author.email;

  messageTime.textContent = formatTimestamp(messageData.timestamp);
  messageText.textContent = messageData.text;

  // Add attachments if any
  if (messageData.attachments && messageData.attachments.length > 0) {
    attachmentsContainer.innerHTML = messageData.attachments
      .map((attachment) => createAttachmentElement(attachment))
      .join("");
  }

  // Setup reactions
  setupReactions(messageElement, messageData);

  // Add click handlers
  authorName.addEventListener("click", () =>
    showUserProfile(messageData.userId)
  );
  setupMessageActions(messageElement, messageId, messageData);

  return messageElement;
}

// Create attachment element
function createAttachmentElement(attachment) {
  const isImage = attachment.type.startsWith("image/");
  return `
    <div class="attachment">
      ${
        isImage
          ? `<img src="${attachment.url}" alt="${attachment.name}" />`
          : ""
      }
      <div class="attachment-info">
        <i class="${getFileIcon(attachment.type)}"></i>
        <span class="attachment-name">${attachment.name}</span>
      </div>
    </div>
  `;
}

// Setup message actions
function setupMessageActions(messageElement, messageId, messageData) {
  const reactionBtn = messageElement.querySelector(".reaction-btn");
  const replyBtn = messageElement.querySelector(".reply-btn");

  if (reactionBtn) {
    reactionBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleReaction(messageId);
    });
  }

  if (replyBtn) {
    replyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleReply(messageId, messageData);
    });
  }
}

// Handle input
function handleInput(e) {
  const text = e.target.value.trim();
  sendBtn.disabled = text.length === 0 && selectedFiles.length === 0;
  updateTypingStatus(text.length > 0);
}

// Handle key press
function handleKeyPress(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

// Handle send
async function handleSend() {
  console.log("[Chat] Handling message send");
  if (!messageInput.value.trim() && selectedFiles.length === 0) return;

  try {
    const attachments = await uploadAttachments();
    console.log("[Chat] Attachments uploaded:", attachments);

    const messageData = {
      text: messageInput.value.trim(),
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
      attachments,
      reactions: {},
    };

    // Add reply metadata if replying
    if (messageInput.dataset.replyTo) {
      messageData.replyTo = messageInput.dataset.replyTo;
      console.log("[Chat] Adding reply metadata:", messageData.replyTo);
      delete messageInput.dataset.replyTo;
      const replyIndicator = document.querySelector(".reply-indicator");
      if (replyIndicator) replyIndicator.remove();
    }

    console.log("[Chat] Sending message:", messageData);
    await addDoc(collection(db, "messages"), messageData);
    console.log("[Chat] Message sent successfully");

    messageInput.value = "";
    selectedFiles = [];
    attachmentPreview.innerHTML = "";
    sendBtn.disabled = true;
    updateTypingStatus(false);
  } catch (error) {
    console.error("[Chat] Error sending message:", error);
    showToast("Failed to send message", "error");
  }
}

// Upload attachments
async function uploadAttachments() {
  if (selectedFiles.length === 0) return [];

  const attachments = [];
  for (const file of selectedFiles) {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `chat_attachments/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      attachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url,
      });
    } catch (error) {
      console.error("[Chat] Error uploading file:", error);
      showToast(`Failed to upload ${file.name}`, "error");
    }
  }

  return attachments;
}

// Handle file select
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  selectedFiles = [...selectedFiles, ...files];
  updateAttachmentPreview();
}

// Update attachment preview
function updateAttachmentPreview() {
  attachmentPreview.innerHTML = selectedFiles
    .map(
      (file, index) => `
    <div class="preview-item">
      ${
        file.type.startsWith("image/")
          ? `<img src="${URL.createObjectURL(file)}" alt="${file.name}" />`
          : `<i class="${getFileIcon(file.type)}"></i>`
      }
      <button class="remove-preview" onclick="removeAttachment(${index})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `
    )
    .join("");

  sendBtn.disabled =
    messageInput.value.trim().length === 0 && selectedFiles.length === 0;
}

// Remove attachment
window.removeAttachment = function (index) {
  selectedFiles.splice(index, 1);
  updateAttachmentPreview();
};

// Update typing status
function updateTypingStatus(isTyping) {
  clearTimeout(typingTimeout);
  if (isTyping) {
    updateTypingIndicator(currentUser.uid, true);
    typingTimeout = setTimeout(() => {
      updateTypingIndicator(currentUser.uid, false);
    }, TYPING_TIMEOUT);
  } else {
    updateTypingIndicator(currentUser.uid, false);
  }
}

// Update typing indicator
async function updateTypingIndicator(userId, isTyping) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isTyping,
      lastTypingUpdate: serverTimestamp(),
    });
  } catch (error) {
    console.error("[Chat] Error updating typing status:", error);
  }
}

// Subscribe to online users
function subscribeToOnlineUsers() {
  const usersQuery = query(
    collection(db, "users"),
    where("online", "==", true)
  );

  onSnapshot(usersQuery, (snapshot) => {
    onlineUsers.clear();
    snapshot.forEach((doc) => {
      if (doc.id !== currentUser.uid) {
        onlineUsers.add(doc.id);
      }
    });
    updateOnlineUsersUI();
  });
}

// Update online users UI
async function updateOnlineUsersUI() {
  onlineUsersAvatars.innerHTML = "";
  onlineCountElement.textContent = onlineUsers.size + 1; // +1 for current user

  for (const userId of onlineUsers) {
    const user = await getUserProfile(userId);
    const avatarElement = document.createElement("div");
    avatarElement.className = "user-avatar";
    avatarElement.innerHTML = user.profilePicture
      ? `<img src="${user.profilePicture}" alt="${
          user.displayName || "User"
        }" title="${user.displayName || "User"}" />`
      : `<div class="user-initials" title="${user.displayName || "User"}">${(
          user.displayName || "User"
        )
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)}</div>`;
    onlineUsersAvatars.appendChild(avatarElement);
  }
}

// Update online status
async function updateOnlineStatus(online) {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      online,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("[Chat] Error updating online status:", error);
  }
}

// Setup message deletion
function setupMessageDeletion() {
  const now = new Date();
  const cutoff = new Date(now.setDate(now.getDate() - MESSAGE_EXPIRY_DAYS));

  const expiredMessagesQuery = query(
    collection(db, "messages"),
    where("timestamp", "<=", cutoff)
  );

  onSnapshot(expiredMessagesQuery, (snapshot) => {
    snapshot.forEach(async (doc) => {
      try {
        await deleteDoc(doc.ref);
        console.log("[Chat] Deleted expired message:", doc.id);
      } catch (error) {
        console.error("[Chat] Error deleting expired message:", error);
      }
    });
  });
}

// Get user profile
async function getUserProfile(userId) {
  if (userProfileCache.has(userId)) {
    return userProfileCache.get(userId);
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists()
      ? userDoc.data()
      : { email: "Unknown User" };
    userProfileCache.set(userId, userData);
    return userData;
  } catch (error) {
    console.error("[Chat] Error fetching user profile:", error);
    return { email: "Unknown User" };
  }
}

// Show user profile
async function showUserProfile(userId) {
  const modal = document.getElementById("userProfileModal");
  const userData = await getUserProfile(userId);

  modal.querySelector(".modal-content").innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">
        ${
          userData.profilePicture
            ? `<img src="${userData.profilePicture}" alt="Profile Picture">`
            : `<span class="author-initials">${(userData.displayName || "User")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}</span>`
        }
      </div>
      <div class="profile-info">
        <h3>${userData.displayName || "Anonymous"}</h3>
        ${
          userData.nickname
            ? `<p class="nickname">@${userData.nickname}</p>`
            : ""
        }
      </div>
    </div>
    <div class="profile-details">
      ${
        userData.bio
          ? `<div class="profile-section">
              <h4><i class="fas fa-user"></i> Bio</h4>
              <p>${userData.bio}</p>
            </div>`
          : ""
      }
      ${
        userData.expertise
          ? `<div class="profile-section">
              <h4><i class="fas fa-brain"></i> Expertise</h4>
              <div class="tags">
                ${userData.expertise
                  .map((exp) => `<span class="tag">${exp}</span>`)
                  .join("")}
              </div>
            </div>`
          : ""
      }
      ${
        userData.interests
          ? `<div class="profile-section">
              <h4><i class="fas fa-heart"></i> Interests</h4>
              <div class="tags">
                ${userData.interests
                  .map((int) => `<span class="tag">${int}</span>`)
                  .join("")}
              </div>
            </div>`
          : ""
      }
    </div>
  `;

  modal.classList.add("active");
}

// Load emoji data
async function loadEmojiData() {
  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/emoji.json/emoji.json"
    );
    emojiData = await response.json();
    initializeEmojiPicker();
  } catch (error) {
    console.error("[Chat] Error loading emoji data:", error);
  }
}

// Initialize emoji picker
function initializeEmojiPicker() {
  const categories = {
    smileys: "😀",
    people: "👋",
    animals: "🐶",
    food: "🍎",
    activities: "⚽",
    travel: "🌍",
    objects: "💡",
    symbols: "❤️",
  };

  emojiPicker.innerHTML = `
    <div class="emoji-categories">
      ${Object.entries(categories)
        .map(
          ([category, icon]) => `
        <button class="category-btn" data-category="${category}">
          ${icon}
        </button>
      `
        )
        .join("")}
    </div>
    <div class="emojis-container"></div>
  `;

  const categoryBtns = emojiPicker.querySelectorAll(".category-btn");
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showEmojiCategory(btn.dataset.category);
      categoryBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Show first category by default
  showEmojiCategory("smileys");
}

// Show emoji category
function showEmojiCategory(category) {
  const container = emojiPicker.querySelector(".emojis-container");
  container.innerHTML = emojiData
    .filter((emoji) => emoji.category === category)
    .map(
      (emoji) => `
      <div class="emoji-item" onclick="insertEmoji('${emoji.char}')">${emoji.char}</div>
    `
    )
    .join("");
}

// Insert emoji
window.insertEmoji = function (emoji) {
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const text = messageInput.value;
  messageInput.value = text.slice(0, start) + emoji + text.slice(end);
  messageInput.focus();
  messageInput.selectionStart = messageInput.selectionEnd =
    start + emoji.length;
  handleInput({ target: messageInput });
};

// Toggle emoji picker
function toggleEmojiPicker() {
  emojiPicker.classList.toggle("active");
}

// Handle click outside
function handleClickOutside(e) {
  if (
    !emojiPicker.contains(e.target) &&
    !emojiBtn.contains(e.target) &&
    emojiPicker.classList.contains("active")
  ) {
    emojiPicker.classList.remove("active");
  }
}

// Handle reply
function handleReply(messageId, messageData) {
  console.log("[Chat] Handling reply to message:", { messageId, messageData });
  const replyText =
    messageData.text.slice(0, 50) + (messageData.text.length > 50 ? "..." : "");

  // Add reply indicator to input
  messageInput.value = `Replying to: "${replyText}"\n${messageInput.value}`;
  messageInput.focus();

  // Add reply metadata
  messageInput.dataset.replyTo = messageId;

  // Add visual indicator
  const replyIndicator = document.createElement("div");
  replyIndicator.className = "reply-indicator";
  replyIndicator.innerHTML = `
    <span>Replying to message</span>
    <button class="cancel-reply">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Add before input
  messageInput.parentElement.insertBefore(replyIndicator, messageInput);

  // Handle cancel reply
  replyIndicator
    .querySelector(".cancel-reply")
    .addEventListener("click", () => {
      delete messageInput.dataset.replyTo;
      replyIndicator.remove();
      messageInput.value = messageInput.value.replace(
        /^Replying to: ".*"\n/,
        ""
      );
    });
}

// Utility functions
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getFileIcon(mimeType) {
  if (mimeType.startsWith("image/")) return "fas fa-image";
  if (mimeType.startsWith("video/")) return "fas fa-video";
  if (mimeType.startsWith("audio/")) return "fas fa-music";
  if (mimeType.includes("pdf")) return "fas fa-file-pdf";
  if (mimeType.includes("word")) return "fas fa-file-word";
  if (mimeType.includes("excel")) return "fas fa-file-excel";
  return "fas fa-file";
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Update message when modified
function updateMessage(doc) {
  const messageData = doc.data();
  const messageElement = document.querySelector(
    `.message[data-id="${doc.id}"]`
  );
  if (!messageElement) return;

  const messageText = messageElement.querySelector(".message-text");
  const attachmentsContainer = messageElement.querySelector(
    ".message-attachments"
  );

  // Update text content
  messageText.textContent = messageData.text;

  // Update attachments if any
  if (messageData.attachments && messageData.attachments.length > 0) {
    attachmentsContainer.innerHTML = messageData.attachments
      .map((attachment) => createAttachmentElement(attachment))
      .join("");
  } else {
    attachmentsContainer.innerHTML = "";
  }

  // Update reactions
  setupReactions(messageElement, messageData);
}

// Remove message when deleted
function removeMessage(messageId) {
  const messageElement = document.querySelector(
    `.message[data-id="${messageId}"]`
  );
  if (messageElement) {
    messageElement.remove();
  }
}

// Setup reactions for a message
function setupReactions(messageElement, messageData) {
  const reactionsContainer = messageElement.querySelector(
    ".reactions-container"
  );
  reactionsContainer.innerHTML = "";

  if (messageData.reactions) {
    Object.entries(messageData.reactions).forEach(([emoji, users]) => {
      if (users.length > 0) {
        const reactionElement = document.createElement("div");
        reactionElement.className = "reaction";
        reactionElement.innerHTML = `
          ${emoji}
          <span class="count">${users.length}</span>
        `;

        // Add active class if current user reacted
        if (users.includes(currentUser.uid)) {
          reactionElement.classList.add("active");
        }

        // Add click handler for toggling reaction
        reactionElement.addEventListener("click", () => {
          handleReaction(messageData.id, emoji);
        });

        reactionsContainer.appendChild(reactionElement);
      }
    });
  }
}

// Handle reaction toggle
async function handleReaction(messageId, emoji = "👍") {
  if (!messageId) {
    console.error("[Chat] Invalid messageId:", messageId);
    return;
  }

  try {
    const messageRef = doc(db, "messages", messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      console.error("[Chat] Message not found:", messageId);
      return;
    }

    const currentUser = auth.currentUser;
    const reactions = messageDoc.data().reactions || {};

    if (reactions[currentUser.uid] === emoji) {
      // Remove reaction if same emoji clicked again
      delete reactions[currentUser.uid];
    } else {
      // Add or update reaction
      reactions[currentUser.uid] = emoji;
    }

    await updateDoc(messageRef, { reactions });
    console.log("[Chat] Reaction updated successfully");
  } catch (error) {
    console.error("[Chat] Error updating reaction:", error);
  }
}

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  updateOnlineStatus(false);
  if (messageObserver) {
    messageObserver();
  }
});

// Initialize settings from localStorage
function initializeSettings() {
  const savedSettings = localStorage.getItem("chatSettings");
  if (savedSettings) {
    Object.assign(chatSettings, JSON.parse(savedSettings));
  }
  applySettings();
}

// Apply settings to UI
function applySettings() {
  // Apply theme
  document.body.className = `theme-${chatSettings.theme}`;

  // Apply background
  document.querySelector(
    ".chat-container"
  ).className = `chat-container background-${chatSettings.background}`;

  // Apply bubble style
  document.documentElement.style.setProperty(
    "--message-border-radius",
    getBubbleStyle(chatSettings.bubbleStyle)
  );

  // Apply font size
  document.documentElement.style.setProperty(
    "--base-font-size",
    getFontSize(chatSettings.fontSize)
  );

  // Update settings UI
  document.getElementById("themeSelect").value = chatSettings.theme;
  document.getElementById("backgroundSelect").value = chatSettings.background;
  document.getElementById("bubbleSelect").value = chatSettings.bubbleStyle;
  document.getElementById("notificationSound").checked =
    chatSettings.notificationSound;
  document.getElementById("soundEffects").checked = chatSettings.soundEffects;
  document.getElementById("messagePreview").checked =
    chatSettings.messagePreview;
  document.getElementById("readReceipts").checked = chatSettings.readReceipts;
  document.getElementById("onlineStatus").checked = chatSettings.onlineStatus;
  document.getElementById("retentionSelect").value =
    chatSettings.messageRetention;
  document.getElementById("fontSizeSelect").value = chatSettings.fontSize;
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem("chatSettings", JSON.stringify(chatSettings));
}

// Helper functions
function getBubbleStyle(style) {
  const styles = {
    default: "12px",
    rounded: "20px",
    sharp: "4px",
    modern: "16px 16px 4px 16px",
  };
  return styles[style] || styles.default;
}

function getFontSize(size) {
  const sizes = {
    small: "14px",
    medium: "16px",
    large: "18px",
  };
  return sizes[size] || sizes.medium;
}

// Message search functionality
const messageSearch = document.getElementById("messageSearch");
messageSearch.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const messages = document.querySelectorAll(".message");

  messages.forEach((message) => {
    const text = message
      .querySelector(".message-text")
      .textContent.toLowerCase();
    const author = message
      .querySelector(".message-author")
      .textContent.toLowerCase();

    if (text.includes(searchTerm) || author.includes(searchTerm)) {
      message.style.display = "flex";
      message.style.animation = "highlight 2s";
    } else {
      message.style.display = "none";
    }
  });
});

// Settings event listeners
document.getElementById("themeSelect").addEventListener("change", (e) => {
  chatSettings.theme = e.target.value;
  applySettings();
  saveSettings();
});

document.getElementById("backgroundSelect").addEventListener("change", (e) => {
  chatSettings.background = e.target.value;
  applySettings();
  saveSettings();
});

document.getElementById("bubbleSelect").addEventListener("change", (e) => {
  chatSettings.bubbleStyle = e.target.value;
  applySettings();
  saveSettings();
});

document.getElementById("notificationSound").addEventListener("change", (e) => {
  chatSettings.notificationSound = e.target.checked;
  saveSettings();
});

document.getElementById("soundEffects").addEventListener("change", (e) => {
  chatSettings.soundEffects = e.target.checked;
  saveSettings();
});

document.getElementById("messagePreview").addEventListener("change", (e) => {
  chatSettings.messagePreview = e.target.checked;
  saveSettings();
});

document.getElementById("readReceipts").addEventListener("change", (e) => {
  chatSettings.readReceipts = e.target.checked;
  saveSettings();
});

document.getElementById("onlineStatus").addEventListener("change", (e) => {
  chatSettings.onlineStatus = e.target.checked;
  saveSettings();
});

document.getElementById("retentionSelect").addEventListener("change", (e) => {
  chatSettings.messageRetention = e.target.value;
  saveSettings();
});

document.getElementById("fontSizeSelect").addEventListener("change", (e) => {
  chatSettings.fontSize = e.target.value;
  applySettings();
  saveSettings();
});

// Initialize settings when page loads
document.addEventListener("DOMContentLoaded", initializeSettings);

// Sound effects
const sounds = {
  message: new Audio("/assets/sounds/message.mp3"),
  notification: new Audio("/assets/sounds/notification.mp3"),
  reaction: new Audio("/assets/sounds/reaction.mp3"),
};

function playSound(soundName) {
  if (chatSettings.soundEffects && sounds[soundName]) {
    sounds[soundName].play().catch(() => {
      console.log("Sound playback failed");
    });
  }
}

// Desktop notifications
function requestNotificationPermission() {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

function showNotification(title, body) {
  if (chatSettings.notificationSound && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/assets/images/chat-icon.png",
    });
  }
}

// Message retention cleanup
function cleanupOldMessages() {
  const messages = document.querySelectorAll(".message");
  const now = new Date();

  messages.forEach((message) => {
    const timestamp = new Date(message.dataset.timestamp);
    const age = now - timestamp;

    switch (chatSettings.messageRetention) {
      case "24h":
        if (age > 24 * 60 * 60 * 1000) message.remove();
        break;
      case "7d":
        if (age > 7 * 24 * 60 * 60 * 1000) message.remove();
        break;
      case "30d":
        if (age > 30 * 24 * 60 * 60 * 1000) message.remove();
        break;
    }
  });
}

// Run cleanup periodically
setInterval(cleanupOldMessages, 60 * 60 * 1000); // Every hour

// Initialize all new features
function initializeNewFeatures() {
  initializeSettings();
  initializeSearch();
  initializeSettingsListeners();
  initializeSettingsModal();
}
