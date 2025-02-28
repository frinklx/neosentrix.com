import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

export async function trackAnalysis(userId, result) {
  console.log("[Analytics] Tracking analysis result:", { userId });

  try {
    const timestamp = Date.now();
    const analysisRef = doc(collection(db, "analysis_history"));

    const analyticsData = {
      userId,
      timestamp,
      textLength: result.textLength || 0,
      success: result.success || false,
      error: result.error || null,
    };

    // Only add metrics if analysis was successful
    if (result.success && result.aiMetrics) {
      analyticsData.aiScore = result.aiMetrics.overall;
      analyticsData.aiMetrics = result.aiMetrics;
      analyticsData.plagiarismMatches = (result.plagiarismMatches || []).length;
    }

    await setDoc(analysisRef, analyticsData);

    console.log("[Analytics] Analysis tracked successfully");
    return true;
  } catch (error) {
    console.error("[Analytics] Error tracking analysis:", error);
    return false;
  }
}

export async function getUserStats(userId) {
  console.log("[Analytics] Fetching user stats:", { userId });

  try {
    const analysisQuery = query(
      collection(db, "analysis_history"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(analysisQuery);
    const analyses = [];
    let totalChecks = 0;
    let totalPlagiarismFound = 0;
    let averageAiScore = 0;
    let aiScoreDistribution = {
      low: 0, // 0-33
      medium: 0, // 34-66
      high: 0, // 67-100
    };

    snapshot.forEach((doc) => {
      const data = doc.data();
      analyses.push(data);

      if (data.success) {
        totalChecks++;
        totalPlagiarismFound += data.plagiarismMatches;
        averageAiScore += data.aiScore;

        // Update AI score distribution
        if (data.aiScore <= 33) aiScoreDistribution.low++;
        else if (data.aiScore <= 66) aiScoreDistribution.medium++;
        else aiScoreDistribution.high++;
      }
    });

    // Calculate averages and percentages
    averageAiScore =
      totalChecks > 0 ? Math.round(averageAiScore / totalChecks) : 0;
    const plagiarismRate =
      totalChecks > 0
        ? Math.round((totalPlagiarismFound / totalChecks) * 100)
        : 0;

    // Get recent activity
    const recentActivity = analyses.slice(0, 10).map((a) => ({
      timestamp: a.timestamp,
      textLength: a.textLength,
      aiScore: a.aiScore,
      plagiarismMatches: a.plagiarismMatches,
      success: a.success,
    }));

    console.log("[Analytics] User stats compiled successfully");

    return {
      totalChecks,
      totalPlagiarismFound,
      averageAiScore,
      plagiarismRate,
      aiScoreDistribution,
      recentActivity,
      success: true,
    };
  } catch (error) {
    console.error("[Analytics] Error fetching user stats:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getGlobalStats() {
  console.log("[Analytics] Fetching global stats");

  try {
    const analysisQuery = query(
      collection(db, "analysis_history"),
      orderBy("timestamp", "desc"),
      limit(1000) // Limit to last 1000 analyses for performance
    );

    const snapshot = await getDocs(analysisQuery);
    let totalChecks = 0;
    let totalPlagiarismFound = 0;
    let averageAiScore = 0;
    let userCount = new Set();
    let aiScoreDistribution = {
      low: 0,
      medium: 0,
      high: 0,
    };

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.success) {
        totalChecks++;
        totalPlagiarismFound += data.plagiarismMatches;
        averageAiScore += data.aiScore;
        userCount.add(data.userId);

        if (data.aiScore <= 33) aiScoreDistribution.low++;
        else if (data.aiScore <= 66) aiScoreDistribution.medium++;
        else aiScoreDistribution.high++;
      }
    });

    averageAiScore =
      totalChecks > 0 ? Math.round(averageAiScore / totalChecks) : 0;
    const plagiarismRate =
      totalChecks > 0
        ? Math.round((totalPlagiarismFound / totalChecks) * 100)
        : 0;

    console.log("[Analytics] Global stats compiled successfully");

    return {
      totalChecks,
      totalPlagiarismFound,
      averageAiScore,
      plagiarismRate,
      uniqueUsers: userCount.size,
      aiScoreDistribution,
      success: true,
    };
  } catch (error) {
    console.error("[Analytics] Error fetching global stats:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
