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
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { firebaseConfig } from "../../shared/utils/firebase-config.js";
import { showToast } from "../../shared/utils/ui.js";

// Initialize Firebase
console.log("[Resources] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// State variables
let currentUser = null;
let lastVisible = null;
let isLoading = false;
let activeFilters = {
  school: "",
  subject: "",
  type: "",
  search: "",
  sort: "recent",
};
let currentView = "grid";
let resources = [];
let viewedResources = new Set();

// DOM Elements - declare as let since we'll reassign them
let uploadBtn;
let uploadModal;
let uploadForm;
let fileDropZone;
let searchInput;
let schoolFilter;
let subjectFilter;
let typeFilter;
let resourcesContainer;
let activeTagsContainer;
let addResourceBtn;
let addResourceModal;
let resourceForm;
let previewModal;
let viewButtons;
let logoutBtn;

// Modal Functionality
const createResourceBtn = document.querySelector(".create-resource-btn");
const modalOverlay = document.getElementById("createResourceModal");
const closeModalBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelResource");
const tagsInput = document.getElementById("tagsInput");
const tagInput = document.getElementById("tagInput");
const fileUpload = document.getElementById("fileUpload");
const fileInput = document.getElementById("resourceFile");
const filePreview = document.getElementById("filePreview");
const removeFileBtn = document.getElementById("removeFile");

let tags = new Set();

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Resources] DOM Content Loaded");
  initializeDOMElements();
  initializeEventListeners();
  initializeAuth();
});

// Initialize DOM Elements
function initializeDOMElements() {
  console.log("[Resources] Initializing DOM Elements");
  uploadBtn = document.getElementById("uploadBtn");
  uploadModal = document.getElementById("uploadModal");
  uploadForm = document.getElementById("uploadForm");
  fileDropZone = document.getElementById("fileDropZone");
  searchInput = document.getElementById("searchInput");
  schoolFilter = document.getElementById("schoolFilter");
  subjectFilter = document.getElementById("subjectFilter");
  typeFilter = document.getElementById("typeFilter");
  resourcesContainer = document.getElementById("resourcesGrid");
  activeTagsContainer = document.getElementById("activeTags");
  addResourceBtn = document.getElementById("addResourceBtn");
  addResourceModal = document.getElementById("addResourceModal");
  resourceForm = document.getElementById("resourceForm");
  previewModal = document.getElementById("previewModal");
  viewButtons = document.querySelectorAll(".view-btn");
  logoutBtn = document.getElementById("logoutBtn");

  // Log element initialization status
  console.log("[Resources] DOM Elements initialized:", {
    uploadBtn: !!uploadBtn,
    uploadModal: !!uploadModal,
    uploadForm: !!uploadForm,
    fileDropZone: !!fileDropZone,
    searchInput: !!searchInput,
    schoolFilter: !!schoolFilter,
    subjectFilter: !!subjectFilter,
    typeFilter: !!typeFilter,
    resourcesContainer: !!resourcesContainer,
    activeTagsContainer: !!activeTagsContainer,
    addResourceBtn: !!addResourceBtn,
    addResourceModal: !!addResourceModal,
    resourceForm: !!resourceForm,
    previewModal: !!previewModal,
    viewButtons: !!viewButtons?.length,
    logoutBtn: !!logoutBtn,
  });
}

function initializeAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        updateUIWithUserData(userDoc.data());
      }
      loadResources();
    } else {
      window.location.href =
        "/auth/login?message=Please log in to access resources";
    }
  });
}

function initializeEventListeners() {
  console.log("[Resources] Initializing Event Listeners");

  // Upload Modal
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => showModal(uploadModal));
  }
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => hideModal(btn.closest(".modal")));
  });

  // File Upload
  if (fileDropZone) {
    fileDropZone.addEventListener("click", () => fileDropZone.click());
    fileDropZone.addEventListener("dragover", handleDragOver);
    fileDropZone.addEventListener("dragleave", handleDragLeave);
    fileDropZone.addEventListener("drop", handleDrop);
  }

  // Content Type Selection
  if (document.querySelectorAll(".content-type-btn")) {
    document.querySelectorAll(".content-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchContentType(btn.dataset.type));
    });
  }

  // Form Submission
  if (uploadForm) {
    uploadForm.addEventListener("submit", handleResourceSubmit);
  }

  // Filters
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }
  if (schoolFilter) {
    schoolFilter.addEventListener("change", handleFilterChange);
  }
  if (subjectFilter) {
    subjectFilter.addEventListener("change", handleFilterChange);
  }
  if (typeFilter) {
    typeFilter.addEventListener("change", handleFilterChange);
  }

  // Infinite Scroll
  window.addEventListener("scroll", handleScroll);

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Add Resource Button
  if (addResourceBtn) {
    addResourceBtn.addEventListener("click", () => {
      console.log("[Resources] Add Resource button clicked");
      if (addResourceModal) {
        addResourceModal.classList.add("active");
      }
    });
  }

  // Resource Form
  if (resourceForm) {
    resourceForm.addEventListener("submit", handleResourceSubmit);
  }

  // View Toggle
  if (viewButtons) {
    viewButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        currentView = btn.dataset.view;
        viewButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        displayResources(resources);
      });
    });
  }

  // Content Type Toggle
  if (document.querySelectorAll(".type-btn")) {
    document.querySelectorAll(".type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".type-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".content-section").forEach((section) => {
          section.classList.remove("active");
        });
        const contentSection = document.getElementById(
          `${btn.dataset.type}Content`
        );
        if (contentSection) {
          contentSection.classList.add("active");
        }
      });
    });
  }

  // Initialize content type toggle
  initializeContentTypeToggle();

  console.log("[Resources] Event Listeners initialized");
}

function updateUIWithUserData(userData) {
  const userInitials = document.getElementById("userInitials");
  if (userInitials) {
    userInitials.textContent = userData.displayName
      ? userData.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : userData.email.substring(0, 2).toUpperCase();
  }
}

// Modal Functions
function showModal(modal) {
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideModal(modal) {
  modal.classList.remove("show");
  document.body.style.overflow = "";
}

// File Upload Handlers
function handleDragOver(e) {
  e.preventDefault();
  fileDropZone.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  fileDropZone.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  fileDropZone.classList.remove("dragover");
  const files = e.dataTransfer.files;
  handleFiles(files);
}

function handleFiles(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  if (validateFile(file)) {
    updateFileDropZone(file);
  }
}

function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
  ];

  if (file.size > maxSize) {
    showToast("File size must be less than 10MB", "error");
    return false;
  }

  if (!allowedTypes.includes(file.type)) {
    showToast("Invalid file type", "error");
    return false;
  }

  return true;
}

function updateFileDropZone(file) {
  const p = fileDropZone.querySelector("p");
  p.textContent = `Selected: ${file.name}`;
}

// Content Type Switching
function switchContentType(type) {
  document.querySelectorAll(".content-type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  document.querySelectorAll(".content-input").forEach((input) => {
    input.style.display = "none";
  });

  document.querySelector(`.${type}-content`).style.display = "block";
}

// Resource Submission
async function handleResourceSubmit(e) {
  e.preventDefault();
  console.log("[Resources] Handling resource submission");

  try {
    const form = e.target;

    // Validate form elements exist
    const titleInput = form.querySelector("#resourceTitle");
    const descriptionInput = form.querySelector("#resourceDescription");
    const schoolInput = form.querySelector("#resourceSchool");
    const subjectInput = form.querySelector("#resourceSubject");
    const typeButton = document.querySelector(".type-btn.active");

    // Check if all required elements exist
    if (
      !titleInput ||
      !descriptionInput ||
      !schoolInput ||
      !subjectInput ||
      !typeButton
    ) {
      console.error("[Resources] Form elements not found:", {
        titleInput: !!titleInput,
        descriptionInput: !!descriptionInput,
        schoolInput: !!schoolInput,
        subjectInput: !!subjectInput,
        typeButton: !!typeButton,
      });
      throw new Error("Required form elements not found");
    }

    // Get values after validation
    const title = titleInput.value;
    const description = descriptionInput.value;
    const school = schoolInput.value;
    const subject = subjectInput.value;
    const type = typeButton.dataset.type;

    // Validate required fields
    if (!title || !description || !school || !subject || !type) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    // Get current user data
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;

    // Determine the display name in order of preference: nickname > displayName > name > email
    const displayName =
      userData?.nickname ||
      userData?.displayName ||
      userData?.name ||
      currentUser.displayName ||
      currentUser.email;

    const resourceData = {
      title,
      description,
      school,
      subject,
      type,
      userId: currentUser.uid,
      author: {
        displayName,
        email: currentUser.email,
        profilePicture:
          userData?.profilePicture || currentUser.photoURL || null,
        nickname: userData?.nickname || null,
        name: userData?.name || currentUser.displayName || null,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: [],
      favorited_by: [],
      views: 0,
    };

    // Handle content based on type
    if (type === "file") {
      const fileInput = document.getElementById("resourceFile");
      const files = fileInput.files;

      if (files.length === 0) {
        showToast("Please select a file", "error");
        return;
      }

      const fileUrls = await uploadFiles(files);
      resourceData.content = {
        type: "file",
        files: fileUrls,
      };
    } else if (type === "text") {
      const textContent = form.querySelector("#resourceText")?.value?.trim();

      if (!textContent) {
        showToast("Please enter some text content", "error");
        return;
      }
      resourceData.content = {
        type: "text",
        text: textContent,
      };
    } else if (type === "link") {
      const linkContent = form.querySelector("#resourceLink")?.value?.trim();

      if (!linkContent) {
        showToast("Please enter a valid URL", "error");
        return;
      }
      resourceData.content = {
        type: "link",
        url: linkContent,
      };
    }

    console.log("[Resources] Saving resource to Firestore:", resourceData);
    await addDoc(collection(db, "resources"), resourceData);

    console.log("[Resources] Resource saved successfully");
    showToast("Resource shared successfully!", "success");
    closeModal();
    resetForm();
    await loadResources(true);
  } catch (error) {
    console.error("[Resources] Error sharing resource:", error);
    showToast("Failed to share resource", "error");
  }
}

async function uploadFiles(files) {
  const fileUrls = [];

  for (const file of files) {
    const fileRef = ref(
      storage,
      `resources/${currentUser.uid}/${Date.now()}_${file.name}`
    );
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    fileUrls.push({
      name: file.name,
      type: file.type,
      url: url,
      path: fileRef.fullPath,
    });
  }

  return fileUrls;
}

// Resource Loading
async function loadResources(reset = false) {
  console.log("[Resources] Loading resources, reset:", reset);
  if (isLoading) return;
  isLoading = true;

  try {
    if (reset && resourcesContainer) {
      lastVisible = null;
      resourcesContainer.innerHTML = "";
    }

    let q = query(collection(db, "resources"));
    const filters = [];

    // Apply filters one by one to avoid complex composite indexes
    if (activeFilters.school) {
      filters.push(where("school", "==", activeFilters.school));
    }
    if (activeFilters.subject) {
      filters.push(where("subject", "==", activeFilters.subject));
    }
    if (activeFilters.type) {
      filters.push(where("type", "==", activeFilters.type));
    }
    if (activeFilters.search) {
      filters.push(where("title", ">=", activeFilters.search));
    }

    // Apply sorting
    switch (activeFilters.sort) {
      case "popular":
        filters.push(orderBy("likes", "desc"));
        break;
      case "favorites":
        filters.push(where("favorited_by", "array-contains", currentUser.uid));
        break;
      default:
        filters.push(orderBy("createdAt", "desc"));
    }

    // Apply pagination
    if (lastVisible) {
      filters.push(startAfter(lastVisible));
    }
    filters.push(limit(12));

    // Create query with all filters
    q = query(q, ...filters);

    const querySnapshot = await getDocs(q);
    resources = [];

    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() });
    });

    if (querySnapshot.docs.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    }

    displayResources(resources);
    console.log("[Resources] Resources loaded successfully");
  } catch (error) {
    console.error("[Resources] Error loading resources:", error);
    if (error.code === "failed-precondition") {
      showToast("Please create the required Firestore indexes", "error");
      console.log("[Resources] Required index:", error.details);
    } else {
      showToast("Failed to load resources", "error");
    }
  } finally {
    isLoading = false;
  }
}

// Display Resources
function displayResources(resources) {
  if (!resourcesContainer) {
    console.error("[Resources] Resources container not found");
    return;
  }

  console.log("[Resources] Displaying resources:", resources.length);

  const view = currentView || "grid";
  resourcesContainer.className = `resources-${view}-view`;

  resources.forEach((resource) => {
    const resourceElement = createResourceElement(resource, view);
    resourcesContainer.appendChild(resourceElement);
  });
}

// Create Resource Element
function createResourceElement(resource, view) {
  const isGridView = view === "grid";
  const element = document.createElement("div");
  element.className = isGridView ? "resource-grid-item" : "resource-list-item";
  element.dataset.id = resource.id;

  // Ensure likes and favorited_by are arrays
  const likes = Array.isArray(resource.likes) ? resource.likes : [];
  const favoritedBy = Array.isArray(resource.favorited_by)
    ? resource.favorited_by
    : [];

  // Get author info - prefer nickname over other names
  const authorName =
    resource.author?.nickname ||
    resource.author?.displayName ||
    resource.author?.name ||
    resource.author?.email ||
    "Anonymous";

  const authorInitials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  element.innerHTML = `
    <div class="resource-header">
      <div class="resource-author">
        <div class="author-avatar" title="${authorName}">
          ${
            resource.author?.profilePicture
              ? `<img src="${resource.author.profilePicture}" alt="${authorName}" />`
              : `<span class="author-initials">${authorInitials}</span>`
          }
        </div>
        <div class="author-info">
          <span class="author-name" title="${
            resource.author?.email || ""
          }">${authorName}</span>
          <span class="post-date">${formatDate(resource.createdAt)}</span>
        </div>
      </div>
      <h3>${resource.title}</h3>
      <div class="resource-type">
        <i class="${getResourceTypeIcon(resource.type)}"></i>
        <span>${formatResourceType(resource.type)}</span>
      </div>
      <div class="resource-meta">
        <span class="resource-school">${resource.school}</span>
        <span class="resource-subject">${formatSubject(resource.subject)}</span>
      </div>
    </div>
    <p class="resource-description">${resource.description}</p>
    <div class="resource-footer">
      <div class="resource-stats">
        <button class="stat-btn ${
          likes.includes(currentUser?.uid) ? "active" : ""
        }" 
                onclick="toggleLike('${resource.id}')" 
                title="Like">
          <i class="fas fa-heart"></i>
          <span class="likes-count">${likes.length}</span>
        </button>
        <button class="stat-btn ${
          favoritedBy.includes(currentUser?.uid) ? "active" : ""
        }" 
                onclick="toggleFavorite('${resource.id}')" 
                title="Favorite">
          <i class="fas fa-star"></i>
          <span class="favorites-count">${favoritedBy.length}</span>
        </button>
        <span class="views-count" title="Views">
          <i class="fas fa-eye"></i>
          <span>${resource.views || 0}</span>
        </span>
      </div>
      <div class="resource-actions">
        <button class="preview-btn" onclick="previewResource('${
          resource.id
        }')" title="Preview">
          <i class="fas fa-eye"></i>
        </button>
        ${
          resource.userId === currentUser?.uid
            ? `
          <button class="delete-btn" onclick="deleteResource('${resource.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        `
            : ""
        }
      </div>
    </div>
  `;

  return element;
}

function showEmptyState() {
  resourcesContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-books"></i>
      <h3>No Resources Found</h3>
      <p>Be the first to share a resource!</p>
    </div>
  `;
}

function getResourceTypeIcon(type) {
  const icons = {
    cheatsheet: "fas fa-list-check",
    notes: "fas fa-notebook",
    template: "fas fa-file-alt",
    guide: "fas fa-book",
    practice: "fas fa-pencil",
  };
  return icons[type] || "fas fa-file";
}

function formatResourceType(type) {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatSubject(subject) {
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

// Resource Preview
async function previewResource(resourceId) {
  if (!currentUser) {
    showToast("Please sign in to view resources", "error");
    return;
  }

  try {
    const resourceRef = doc(db, "resources", resourceId);
    const resourceDoc = await getDoc(resourceRef);

    if (!resourceDoc.exists()) {
      showToast("Resource not found", "error");
      return;
    }

    const resource = resourceDoc.data();

    // Update view count only if not already viewed
    if (!viewedResources.has(resourceId)) {
      viewedResources.add(resourceId);
      await updateDoc(resourceRef, {
        views: increment(1),
        viewedBy: arrayUnion(currentUser.uid),
      });
    }

    // Show preview modal
    const modal = document.getElementById("previewModal");
    if (!modal) {
      console.error("[Resources] Preview modal not found");
      showToast("Preview functionality is not available", "error");
      return;
    }

    // Create modal content if it doesn't exist
    let content = modal.querySelector(".preview-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "preview-content";
      content.innerHTML = `
        <button class="preview-close"><i class="fas fa-times"></i></button>
        <div class="preview-header">
          <h2 class="preview-title"></h2>
          <div class="preview-meta">
            <span class="preview-type"></span>
            <span class="preview-school"></span>
            <span class="preview-subject"></span>
          </div>
        </div>
        <div class="preview-body">
          <p class="preview-description"></p>
          <div class="preview-content-area"></div>
        </div>
      `;
      modal.appendChild(content);

      // Add close button event listener
      const closeBtn = content.querySelector(".preview-close");
      closeBtn.addEventListener("click", () =>
        modal.classList.remove("active")
      );
    }

    // Update modal content
    content.querySelector(".preview-title").textContent =
      resource.title || "Untitled";
    content.querySelector(".preview-type").textContent =
      resource.type || "Other";
    content.querySelector(".preview-school").textContent =
      resource.school || "N/A";
    content.querySelector(".preview-subject").textContent =
      resource.subject || "General";

    const previewBody = content.querySelector(".preview-body");
    previewBody.querySelector(".preview-description").textContent =
      resource.description || "No description provided";

    const contentArea = previewBody.querySelector(".preview-content-area");
    contentArea.innerHTML = "";

    // Display content based on type
    switch (resource.content?.type) {
      case "text":
        contentArea.innerHTML = `<div class="text-content">${
          resource.content.text || ""
        }</div>`;
        break;
      case "link":
        contentArea.innerHTML = `
          <div class="link-content">
            <a href="${resource.content.url}" target="_blank" rel="noopener noreferrer">
              <i class="fas fa-external-link-alt"></i>
              Open Resource
            </a>
          </div>
        `;
        break;
      case "file":
        if (resource.content.files && resource.content.files.length > 0) {
          contentArea.innerHTML = resource.content.files
            .map((file) => {
              if (file.type === "application/pdf") {
                return `
                  <div class="pdf-viewer">
                    <iframe
                      src="${file.url}#toolbar=0"
                      type="application/pdf"
                      width="100%"
                      height="600px"
                      frameborder="0"
                    ></iframe>
                  </div>
                `;
              } else {
                return `
                  <div class="file-item">
                    <i class="${getFileIcon(file.type)}"></i>
                    <a href="${
                      file.url
                    }" target="_blank" rel="noopener noreferrer">${
                  file.name
                }</a>
                  </div>
                `;
              }
            })
            .join("");
        } else {
          contentArea.innerHTML =
            '<div class="no-files">No files available</div>';
        }
        break;
      default:
        contentArea.innerHTML =
          '<div class="no-content">No content available</div>';
    }

    // Show modal
    modal.classList.add("active");
  } catch (error) {
    console.error("[Resources] Error previewing resource:", error);
    showToast("Failed to load resource preview", "error");
  }
}

// Load Comments
async function loadComments(resourceId) {
  try {
    const q = query(
      collection(db, `resources/${resourceId}/comments`),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const commentsList = document.getElementById("commentsList");
    commentsList.innerHTML = comments
      .map(
        (comment) => `
      <div class="comment-item">
        <div class="comment-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${comment.userName}</span>
            <span class="comment-date">${formatDate(comment.createdAt)}</span>
          </div>
          <div class="comment-text">${comment.text}</div>
        </div>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("[Resources] Error loading comments:", error);
  }
}

// Update Resource Stats
async function updateResourceStats(resourceId, stats) {
  try {
    await updateDoc(doc(db, "resources", resourceId), stats);
  } catch (error) {
    console.error("[Resources] Error updating resource stats:", error);
  }
}

// Filter Handling
function handleSearch() {
  const searchValue = searchInput?.value || "";
  activeFilters.search = searchValue.trim();
  updateActiveTags();
  loadResources(true);
}

function handleFilterChange(e) {
  const filterId = e.target.id.replace("Filter", "");
  activeFilters[filterId] = e.target.value;
  updateActiveTags();
  loadResources(true);
}

function updateActiveTags() {
  const container = document.getElementById("activeTags");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(activeFilters).forEach(([key, value]) => {
    if (value) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = `
        ${value}
        <i class="fas fa-times" onclick="removeFilter('${key}')"></i>
      `;
      container.appendChild(tag);
    }
  });
}

function removeFilter(key) {
  activeFilters[key] = "";
  document.getElementById(`${key}Filter`).value = "";
  updateActiveTags();
  loadResources(true);
}

// Infinite Scroll
function handleScroll() {
  if (isLoading) return;

  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadResources();
  }
}

// Utility Functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Logout Handler
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "/auth/login?message=Logged out successfully";
  } catch (error) {
    console.error("[Resources] Error during logout:", error);
    showToast("Failed to log out", "error");
  }
}

function getFileIcon(mimeType) {
  if (mimeType.startsWith("image/")) return "fas fa-image";
  if (mimeType.includes("pdf")) return "fas fa-file-pdf";
  if (mimeType.includes("word")) return "fas fa-file-word";
  if (mimeType.includes("powerpoint")) return "fas fa-file-powerpoint";
  return "fas fa-file";
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate();
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }
}

// Content Type Toggle
function initializeContentTypeToggle() {
  console.log("[Resources] Initializing content type toggle");
  const typeButtons = document.querySelectorAll(".type-btn");

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("[Resources] Content type changed to:", btn.dataset.type);

      // Remove active class from all buttons
      typeButtons.forEach((b) => b.classList.remove("active"));
      // Add active class to clicked button
      btn.classList.add("active");

      // Hide all content sections
      document.querySelectorAll(".content-section").forEach((section) => {
        section.classList.remove("active");
      });

      // Show selected content section
      const contentSection = document.getElementById(
        `${btn.dataset.type}Content`
      );
      if (contentSection) {
        contentSection.classList.add("active");
        console.log("[Resources] Activated content section:", btn.dataset.type);
      } else {
        console.log(
          "[Resources] Warning: Content section not found for type:",
          btn.dataset.type
        );
      }
    });
  });
}

// Modal Open/Close
function openModal() {
  modalOverlay.classList.add("active");
  document.body.style.overflow = "hidden";

  // Re-attach form submit handler after modal is opened
  const form = document.getElementById("resourceForm");
  if (form) {
    // Remove any existing handlers to prevent duplicates
    form.removeEventListener("submit", handleResourceSubmit);
    form.addEventListener("submit", handleResourceSubmit);
  } else {
    console.error("[Resources] Resource form not found");
  }
}

function closeModal() {
  modalOverlay.classList.remove("active");
  document.body.style.overflow = "";
  resetForm();
}

// Initialize Modal Event Listeners
if (createResourceBtn) {
  createResourceBtn.addEventListener("click", openModal);
}
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeModal);
}
if (cancelBtn) {
  cancelBtn.addEventListener("click", closeModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
}

// Form Reset
function resetForm() {
  resourceForm.reset();
  tags.clear();
  updateTagsDisplay();
  filePreview.classList.remove("active");
  document
    .querySelectorAll(".type-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector('.type-btn[data-type="text"]').classList.add("active");
  document
    .querySelectorAll(".content-section")
    .forEach((section) => section.classList.remove("active"));
  document.getElementById("textContent").classList.add("active");
}

// Tags Input
function updateTagsDisplay() {
  const tagsContainer =
    tagsInput.querySelector("div") || document.createElement("div");
  tagsContainer.className = "tags-container";
  tagsContainer.innerHTML = Array.from(tags)
    .map(
      (tag) => `
        <span class="tag">
            ${tag}
            <i class="fas fa-times" data-tag="${tag}"></i>
        </span>
    `
    )
    .join("");

  if (!tagsInput.contains(tagsContainer)) {
    tagsInput.insertBefore(tagsContainer, tagInput);
  }
}

tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const tag = tagInput.value.trim();
    if (tag && !tags.has(tag)) {
      tags.add(tag);
      updateTagsDisplay();
      tagInput.value = "";
    }
  }
});

tagsInput.addEventListener("click", (e) => {
  if (e.target.classList.contains("fa-times")) {
    const tag = e.target.dataset.tag;
    tags.delete(tag);
    updateTagsDisplay();
  }
});

// File Upload
fileUpload.addEventListener("click", () => fileInput.click());

fileUpload.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileUpload.classList.add("dragover");
});

fileUpload.addEventListener("dragleave", () => {
  fileUpload.classList.remove("dragover");
});

fileUpload.addEventListener("drop", (e) => {
  e.preventDefault();
  fileUpload.classList.remove("dragover");
  handleFileUpload(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => {
  handleFileUpload(e.target.files);
});

function handleFileUpload(files) {
  if (!files || files.length === 0) return;
  const file = files[0];

  if (validateFile(file)) {
    const fileSize = formatFileSize(file.size);
    const filePreview = document.querySelector(".file-preview");
    const fileName = document.querySelector(".file-name");
    const fileSizeElement = document.querySelector(".file-size");

    filePreview.classList.add("active");
    fileName.textContent = file.name;
    fileSizeElement.textContent = fileSize;
  }
}

removeFileBtn.addEventListener("click", () => {
  fileInput.value = "";
  filePreview.classList.remove("active");
  console.log("File removed");
});

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Resource Preview and Delete Functions
async function deleteResource(resourceId) {
  if (!currentUser) {
    showToast("Please sign in to delete resources", "error");
    return;
  }

  try {
    const resourceRef = doc(db, "resources", resourceId);
    const resourceDoc = await getDoc(resourceRef);

    if (!resourceDoc.exists()) {
      showToast("Resource not found", "error");
      return;
    }

    const resource = resourceDoc.data();

    // Check if user owns the resource
    if (resource.userId !== currentUser.uid) {
      showToast("You can only delete your own resources", "error");
      return;
    }

    if (!confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    // Delete any uploaded files
    if (resource.content.type === "file" && resource.content.files) {
      for (const file of resource.content.files) {
        const fileRef = ref(storage, file.path);
        try {
          await deleteObject(fileRef);
        } catch (error) {
          console.error("[Resources] Error deleting file:", error);
        }
      }
    }

    // Delete the resource document
    await deleteDoc(resourceRef);

    // Remove from UI
    const resourceElement = document.querySelector(`[data-id="${resourceId}"]`);
    if (resourceElement) {
      resourceElement.remove();
    }

    showToast("Resource deleted successfully", "success");
  } catch (error) {
    console.error("[Resources] Error deleting resource:", error);
    showToast("Failed to delete resource", "error");
  }
}

// Add Like/Favorite functionality
async function toggleLike(resourceId) {
  if (!currentUser) {
    showToast("Please sign in to like resources", "error");
    return;
  }

  try {
    const resourceRef = doc(db, "resources", resourceId);
    const resourceDoc = await getDoc(resourceRef);

    if (!resourceDoc.exists()) {
      showToast("Resource not found", "error");
      return;
    }

    const resource = resourceDoc.data();
    const likes = Array.isArray(resource.likes) ? resource.likes : [];
    const isLiked = likes.includes(currentUser.uid);

    // Update Firestore
    await updateDoc(resourceRef, {
      likes: isLiked
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid),
    });

    // Update UI
    const resourceElement = document.querySelector(`[data-id="${resourceId}"]`);
    if (resourceElement) {
      const likeBtn = resourceElement.querySelector(".stat-btn");
      const likesCount = likeBtn.querySelector(".likes-count");

      likeBtn.classList.toggle("active");
      const currentCount = parseInt(likesCount.textContent);
      likesCount.textContent = currentCount + (isLiked ? -1 : 1);
    }

    showToast(isLiked ? "Resource unliked" : "Resource liked", "success");
  } catch (error) {
    console.error("[Resources] Error toggling like:", error);
    showToast("Failed to update like status", "error");
  }
}

async function toggleFavorite(resourceId) {
  if (!currentUser) {
    showToast("Please sign in to favorite resources", "error");
    return;
  }

  try {
    const resourceRef = doc(db, "resources", resourceId);
    const resourceDoc = await getDoc(resourceRef);

    if (!resourceDoc.exists()) {
      showToast("Resource not found", "error");
      return;
    }

    const resource = resourceDoc.data();
    const isFavorited = resource.favorited_by?.includes(currentUser.uid);

    await updateDoc(resourceRef, {
      favorited_by: increment(isFavorited ? -1 : 1),
    });

    // Update UI
    const resourceElement = document.querySelector(`[data-id="${resourceId}"]`);
    if (resourceElement) {
      const favoriteBtn = resourceElement.querySelector(".favorite-btn");
      const favoritesCount = favoriteBtn.querySelector("span");

      favoriteBtn.classList.toggle("active");
      favoritesCount.textContent =
        parseInt(favoritesCount.textContent) + (isFavorited ? -1 : 1);
    }

    showToast(
      isFavorited
        ? "Resource removed from favorites"
        : "Resource added to favorites",
      "success"
    );
  } catch (error) {
    console.error("[Resources] Error toggling favorite:", error);
    showToast("Failed to update favorite status", "error");
  }
}

// Close modal when clicking outside or on close button
document.addEventListener("click", (e) => {
  const modal = document.getElementById("previewModal");
  if (e.target === modal) {
    modal.classList.remove("active");
  }
});

document.querySelector(".preview-close")?.addEventListener("click", () => {
  document.getElementById("previewModal").classList.remove("active");
});

// Make functions globally available
window.previewResource = previewResource;
window.deleteResource = deleteResource;
window.toggleLike = toggleLike;
window.toggleFavorite = toggleFavorite;
window.removeFilter = removeFilter;
