// Import Firebase from CDN (add these imports at the top of your HTML file)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  limit,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase (config should be imported from your firebase-config.js)
import { firebaseConfig } from "/shared/utils/firebase-config.js";

// Google Search API Configuration
const GOOGLE_API_KEY = "AIzaSyCiAQqcHNQd-P5GGzFtfE8uRNtyCk1psYg";
const GOOGLE_SEARCH_ENGINE_ID = "a5503cc73a2c64ef0";

// Import analytics
import { trackAnalysis } from "./analytics.js";

console.log("[Detector] Initializing Firebase app and services...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("[Detector] Firebase services initialized successfully");

// Rate limiting constants
const MAX_REQUESTS_PER_DAY = 1000000;
const REQUEST_WINDOW_MS = 1 * 60 * 60 * 1000; // 1 hour

// Text preprocessing
function preprocessText(text) {
  console.log("[Detector] Preprocessing text:", { length: text?.length });
  if (!text) {
    console.warn("[Detector] Empty text received for preprocessing");
    return "";
  }
  const processed = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
  console.log("[Detector] Text preprocessed successfully:", {
    originalLength: text.length,
    processedLength: processed.length,
  });
  return processed;
}

// Get text similarity using cosine similarity
function getCosineSimilarity(text1, text2) {
  console.log("[Detector] Calculating cosine similarity between texts:", {
    text1Length: text1?.length,
    text2Length: text2?.length,
  });

  if (!text1 || !text2) {
    console.warn("[Detector] Invalid input for similarity calculation");
    return 0;
  }

  const words1 = preprocessText(text1)
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const words2 = preprocessText(text2)
    .split(/\s+/)
    .filter((word) => word.length > 0);

  console.log("[Detector] Word counts:", {
    text1Words: words1.length,
    text2Words: words2.length,
  });

  // Create word frequency maps
  const freqMap1 = new Map();
  const freqMap2 = new Map();

  words1.forEach((word) => {
    freqMap1.set(word, (freqMap1.get(word) || 0) + 1);
  });

  words2.forEach((word) => {
    freqMap2.set(word, (freqMap2.get(word) || 0) + 1);
  });

  console.log("[Detector] Created frequency maps:", {
    map1Size: freqMap1.size,
    map2Size: freqMap2.size,
  });

  // Get unique words
  const uniqueWords = new Set([...freqMap1.keys(), ...freqMap2.keys()]);
  console.log("[Detector] Unique words count:", uniqueWords.size);

  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  uniqueWords.forEach((word) => {
    const freq1 = freqMap1.get(word) || 0;
    const freq2 = freqMap2.get(word) || 0;
    dotProduct += freq1 * freq2;
    magnitude1 += freq1 * freq1;
    magnitude2 += freq2 * freq2;
  });

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  console.log("[Detector] Vector calculations:", {
    dotProduct,
    magnitude1,
    magnitude2,
  });

  if (magnitude1 === 0 || magnitude2 === 0) {
    console.warn("[Detector] Zero magnitude detected, returning 0 similarity");
    return 0;
  }

  const similarity = (dotProduct / (magnitude1 * magnitude2)) * 100;
  console.log("[Detector] Final similarity score:", similarity);
  return similarity;
}

// AI Detection using perplexity and burstiness analysis
function detectAIPatterns(text) {
  console.log("[Detector] Starting AI pattern detection for text:", {
    length: text?.length,
  });

  if (!text) {
    console.warn("[Detector] Empty text received for AI detection");
    return {
      style: 0,
      pattern: 0,
      coherence: 0,
      overall: 0,
    };
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  console.log("[Detector] Sentence count:", sentences.length);

  // Calculate sentence length variance (burstiness)
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
  const burstiness = Math.min(1, variance / (mean * 2)); // Normalize burstiness

  console.log("[Detector] Sentence analysis:", {
    meanLength: mean,
    variance,
    burstiness,
  });

  // Calculate word usage patterns
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRate = uniqueWords.size / words.length;

  console.log("[Detector] Word usage analysis:", {
    totalWords: words.length,
    uniqueWords: uniqueWords.size,
    repetitionRate,
  });

  // Analyze sentence structure patterns
  const structurePatterns = sentences.map((s) => {
    const words = s.trim().split(/\s+/);
    return {
      length: words.length,
      hasComma: s.includes(","),
      hasConjunction: /\b(and|but|or|because|however)\b/i.test(s),
      hasTransition:
        /\b(therefore|thus|consequently|furthermore|moreover)\b/i.test(s),
      hasComplexStructure: /\b(although|despite|while|unless|if|when)\b/i.test(
        s
      ),
    };
  });

  // Calculate structural consistency with improved metrics
  const structuralConsistency =
    structurePatterns.reduce((acc, curr, i, arr) => {
      if (i === 0) return 0;
      const prev = arr[i - 1];
      const lengthSimilarity = Math.min(
        1,
        1 / (1 + Math.abs(curr.length - prev.length))
      );
      const patternSimilarity =
        (curr.hasComma === prev.hasComma ? 1 : 0) +
        (curr.hasConjunction === prev.hasConjunction ? 1 : 0) +
        (curr.hasTransition === prev.hasTransition ? 1 : 0) +
        (curr.hasComplexStructure === prev.hasComplexStructure ? 1 : 0);
      return acc + (lengthSimilarity + patternSimilarity / 4) / 2;
    }, 0) / Math.max(1, sentences.length - 1);

  console.log("[Detector] Structure analysis:", {
    structuralConsistency,
    patterns: structurePatterns,
  });

  // Calculate final metrics with improved normalization
  const styleScore = Math.min(100, Math.max(0, (1 - repetitionRate) * 100));
  const patternScore = Math.min(100, Math.max(0, structuralConsistency * 100));
  const coherenceScore = Math.min(100, Math.max(0, (1 - burstiness) * 100));

  const metrics = {
    style: styleScore,
    pattern: patternScore,
    coherence: coherenceScore,
    overall: Math.round((styleScore + patternScore + coherenceScore) / 3),
  };

  console.log("[Detector] Final AI metrics:", metrics);
  return metrics;
}

// Check for plagiarism using Google Search API
async function searchForSimilarContent(text) {
  console.log("[Detector] Starting plagiarism check for text:", {
    length: text?.length,
  });

  if (!text) {
    console.warn("[Detector] Empty text received for plagiarism check");
    return [];
  }

  console.log("[Detector] Using search configuration:", {
    hasApiKey: !!GOOGLE_API_KEY,
    hasSearchEngineId: !!GOOGLE_SEARCH_ENGINE_ID,
  });

  // Split text into smaller chunks for more accurate matching
  const chunks = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  console.log("[Detector] Text split into sentences:", chunks.length);

  const matches = [];
  const processedChunks = new Set();

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (processedChunks.has(trimmedChunk) || trimmedChunk.length < 20) continue;
    processedChunks.add(trimmedChunk);

    try {
      console.log("[Detector] Processing chunk:", {
        length: trimmedChunk.length,
        text: trimmedChunk,
      });

      const query = encodeURIComponent(trimmedChunk);
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q="${query}"&exactTerms=${query}`;

      console.log("[Detector] Sending search request...");
      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        console.log("[Detector] Search results received:", data.items.length);

        for (const item of data.items) {
          const snippet = item.snippet || "";
          const similarity = getCosineSimilarity(trimmedChunk, snippet);

          if (similarity > 30) {
            matches.push({
              source: item.link,
              text: trimmedChunk,
              similarity: Math.round(similarity),
              matchedText: snippet,
            });
          }
        }
      }
    } catch (error) {
      console.error("[Detector] Error in plagiarism check:", error);
    }
  }

  console.log(
    "[Detector] Plagiarism check complete. Total matches:",
    matches.length
  );
  return matches;
}

// Check user's rate limit
async function checkRateLimit(userId) {
  console.log("[Detector] Checking rate limit for user:", userId);

  if (!userId) {
    console.warn("[Detector] No user ID provided for rate limit check");
    return false;
  }

  const userRef = doc(db, "users", userId);
  console.log("[Detector] Fetching user document...");

  const userDoc = await getDoc(userRef);
  const now = Date.now();

  // If document doesn't exist or is missing requests array, create new
  if (!userDoc.exists() || !userDoc.data().requests) {
    console.log("[Detector] Creating new user document for rate limiting");
    await setDoc(userRef, {
      requests: [now],
      lastReset: now,
    });
    return true;
  }

  const userData = userDoc.data();
  console.log("[Detector] Current user data:", {
    requestCount: userData.requests?.length || 0,
    lastReset: new Date(userData.lastReset || now).toISOString(),
  });

  // Reset requests if 24 hours have passed or if lastReset is missing
  if (!userData.lastReset || now - userData.lastReset > REQUEST_WINDOW_MS) {
    console.log("[Detector] Resetting rate limit counter");
    await setDoc(userRef, {
      requests: [now],
      lastReset: now,
    });
    return true;
  }

  // Ensure requests array exists and filter within the last 24 hours
  const requests = userData.requests || [];
  const recentRequests = requests.filter(
    (time) => now - time < REQUEST_WINDOW_MS
  );

  console.log("[Detector] Recent requests count:", recentRequests.length);

  if (recentRequests.length >= MAX_REQUESTS_PER_DAY) {
    console.warn("[Detector] Rate limit exceeded for user");
    return false;
  }

  // Add new request timestamp
  recentRequests.push(now);
  await setDoc(userRef, {
    requests: recentRequests,
    lastReset: userData.lastReset,
  });

  console.log("[Detector] Rate limit check passed");
  return true;
}

// Main analysis function
export async function analyzeText(text, userId) {
  console.log("[Detector] Starting text analysis:", {
    textLength: text?.length,
    userId,
  });

  try {
    // Check authentication
    if (!auth.currentUser) {
      console.warn("[Detector] User not authenticated");
      throw new Error("User not authenticated");
    }

    // Check rate limit
    console.log("[Detector] Checking rate limit...");
    const canProceed = await checkRateLimit(userId);
    if (!canProceed) {
      console.warn("[Detector] Rate limit check failed");
      throw new Error("Rate limit exceeded. Please try again tomorrow.");
    }

    // Run analysis
    console.log("[Detector] Starting AI detection...");
    const aiMetrics = detectAIPatterns(text);

    console.log("[Detector] Starting plagiarism check...");
    const plagiarismMatches = await searchForSimilarContent(text);

    console.log("[Detector] Analysis complete:", {
      aiScore: aiMetrics.overall,
      matchesFound: plagiarismMatches.length,
    });

    const result = {
      success: true,
      textLength: text.length,
      aiMetrics,
      plagiarismMatches,
    };

    // Track analytics
    await trackAnalysis(userId, result);

    return result;
  } catch (error) {
    console.error("[Detector] Analysis error:", error);
    const errorResult = {
      success: false,
      error: error.message,
      textLength: text?.length,
    };

    // Track failed analysis
    await trackAnalysis(userId, errorResult);

    return errorResult;
  }
}
