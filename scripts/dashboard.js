// dashboard.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", initDashboard);

/* ---------- Utils FIRST (so they're defined before use) ---------- */

function formatCurrency(amount) {
  const n = Number(amount || 0);
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeSetText(selector, value, { format } = {}) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`⚠️ Element not found: ${selector}`);
    return;
  }
  const text = format === "currency" ? formatCurrency(value) : String(value ?? "");
  el.textContent = text;
}

//Loader functions
function showLoader(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const loader = card.querySelector(".loader");
  const content = card.querySelector(".site-ranking");
  if (loader) loader.style.display = "block";
  if (content) content.style.display = "none";
}

function hideLoader(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const loader = card.querySelector(".loader");
  const content = card.querySelector(".site-ranking");
  if (loader) loader.style.display = "none";
  if (content) content.style.display = "block";
}

// ♻️ Reusable progress bar renderer
function renderStatusRanking(statusType, websiteCounts) {
  const container = document.querySelector(`#${statusType}-card .site-ranking`);

  if (!container) {
    console.warn(`⚠️ .site-ranking not found in #${statusType}-card`);
    return;
  }

  const sortedSites = Object.entries(websiteCounts)
    .map(([site, counts]) => [site, counts[statusType] || 0])
    .sort((a, b) => b[1] - a[1]);

  container.innerHTML = '';
  const maxCount = sortedSites[0]?.[1] || 1;

  sortedSites.forEach(([site, count]) => {
    const percentage = (count / maxCount) * 100;
    container.innerHTML += `
      <div class="site-row">
        <span class="site-name">${site}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percentage.toFixed(1)}%;"></div>
        </div>
        <span class="site-count">${count.toLocaleString()}</span>
      </div>
    `;
  });
}


// 📊 Dynamic renderer for totals like orders, paid, charges, outstanding
function renderWebsiteRanking(websiteCounts, cardId = "orders-by-website") {
  const siteList = document.querySelector(`#${cardId} .site-ranking`);

  if (!siteList) {
    console.warn(`⚠️ .site-ranking element not found inside #${cardId} card.`);
    return;
  }

  const sortedSites = Object.entries(websiteCounts)
    .sort((a, b) => b[1] - a[1]);

  siteList.innerHTML = ''; 
  const maxCount = sortedSites[0]?.[1] || 1;

  sortedSites.forEach(([site, count]) => {
    const percentage = (count / maxCount) * 100;
    siteList.innerHTML += `
      <div class="site-row">
        <span class="site-name">${site}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percentage.toFixed(1)}%;"></div>
        </div>
        <span class="site-count">${count.toLocaleString()}</span>
      </div>
    `;
  });
}

/* -------------------- Auth + init -------------------- */
async function initDashboard() {
  console.log("📦 Checking current session...");

  const { data: { session }, error } = await supabase.auth.getSession();
  console.log("🔑 Current session:", session);

  if (error || !session) {
    console.error("❌ No session found or error:", error);
    redirectToLogin();
    return;
  }

  // Store tokens in local storage
  localStorage.setItem("sb-access-token", session.access_token);
  localStorage.setItem("sb-refresh-token", session.refresh_token);
  console.log("✅ Session found:", session);

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, newSession) => {
    console.log("🔄 Auth event:", event, newSession);
    if (event === "SIGNED_OUT" || !newSession) {
      console.warn("⚠️ Session ended, redirecting to login...");
      redirectToLogin();
    } else if (event === "TOKEN_REFRESHED") {
      console.log("🔄 Token refreshed.");
      localStorage.setItem("sb-access-token", newSession.access_token);
      localStorage.setItem("sb-refresh-token", newSession.refresh_token);
    }
  });

  await loadDashboard(session.access_token, session.user);

  // Attach logout event
  document.getElementById("logoutBtn")?.addEventListener("click", onLogout);
}

function redirectToLogin() {
  window.location.href = "index.html";
}

async function onLogout() {
  await supabase.auth.signOut();
  redirectToLogin();
}

function setCard(elementId, html) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = html;
  } else {
    console.warn(`⚠️ Card element #${elementId} not found.`);
  }
}

/* -------------------- Page loaders -------------------- */

async function loadDashboard(token, user) {
  document.getElementById("message").innerText = `Welcome, ${user.email}`;

  try {
    const res = await fetch("https://ecomops-sarar20225.onrender.com/protected/", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("🚨 Protected route status:", res.status);
    if (!res.ok) throw new Error("Unauthorized");
  } catch (err) {
    console.error("⚠️ Error loading dashboard:", err);
    alert("Access denied. Please login again.");
    onLogout();
    return;
  }

  await loadSummaryCards();
  await loadUploads(token);
}

async function loadUploads(token) {
  try {
    const uploadsRes = await fetch("https://ecomops-sarar20225.onrender.com/uploads/list/", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!uploadsRes.ok) throw new Error("Uploads fetch failed");

    const uploads = await uploadsRes.json();
    const list = document.getElementById("fileList");
    
    uploads.forEach(u => {
      // Try to find existing <li> for this upload
      let li = list.querySelector(`li[data-id="${u.id}"]`);
      if (!li) {
        // Create new if not in list
        li = document.createElement("li");
        li.setAttribute("data-id", u.id);
        list.prepend(li);
      }

      // Progress bar HTML if in progress
      let progressHTML = "";
      if (u.status === "in_progress") {
        progressHTML = `
          <div style="background:#eee;width:150px;height:10px;border-radius:5px;margin-top:5px;">
            <div style="background:#4caf50;width:${u.progress || 0}%;height:10px;border-radius:5px;"></div>
          </div>
        `;
      }

      // Update content only (no flicker)
      li.innerHTML = `
        <strong>${u.website}</strong> – ${u.report_type} (${u.duration})
        – <a href="${u.file_url}" target="_blank">View</a><br>
        Status: <span style="font-weight:bold;">${u.status}</span>
        ${u.message ? `<br>Message: ${u.message}` : ""}
        ${progressHTML}
      `;
    });
  } catch (err) {
    console.error("⚠️ Error loading uploads:", err);
  }
}

async function loadSummaryCards() {
  const cardIds = [
    "orders-by-website",
    "shipped-card",
    "cancelled-card",
    "returned-card",
    "paid-card",
    "charges-card",
    "order-value-card",
    "outstanding-card"
  ];

  // Show loaders
  cardIds.forEach(showLoader);

  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch("https://ecomops-sarar20225.onrender.com/dashboard/summary", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch summary");
    const summary = await res.json();

    // Safe helper to set card values
    const safeSetText = (selector, value, isCurrency = false) => {
      const el = document.querySelector(selector);
      if (!el) return console.warn(`⚠️ Element not found: ${selector}`);
      el.textContent = isCurrency ? formatCurrency(value) : Number(value || 0).toLocaleString();
    };

    // ✅ Update totals
    safeSetText("#shipped-card .value", summary.shipped_orders);
    safeSetText("#cancelled-card .value", summary.cancelled_orders);
    safeSetText("#returned-card .value", summary.returned_orders);

    safeSetText("#order-value-card .value", summary.total_order_value, true);
    safeSetText("#paid-card .value", summary.total_paid, true);
    safeSetText("#charges-card .value", summary.total_charges, true);
    safeSetText("#outstanding-card .value", summary.total_outstanding, true);

    // ✅ Per-website breakdown
    renderWebsiteRanking(summary.by_website.orders, "orders-by-website");
    renderWebsiteRanking(summary.by_website.paid, "paid-card");
    renderWebsiteRanking(summary.by_website.charges, "charges-card");
    renderWebsiteRanking(summary.by_website.order_value, "order-value-card");
    renderWebsiteRanking(summary.by_website.outstanding, "outstanding-card");

  } catch (err) {
    console.error("Error loading summary cards:", err);
  } finally {
    // Hide loaders
    cardIds.forEach(hideLoader);
  }
}
//-------------------------------------------------------- ✅ Rebuild daily summary from frontend
async function pollRebuildProgress(sessionId, btn) {
  try {
    const res = await fetch(`https://ecomops-sarar20225.onrender.com/dashboard/rebuild-summary/progress/${sessionId}`);
    const data = await res.json();

    const progressLabel = document.getElementById("progress-label");
    if (progressLabel) progressLabel.textContent = data.status;

    if (!data.status.startsWith("✅") && !data.status.startsWith("❌")) {
      setTimeout(() => pollRebuildProgress(sessionId, btn), 1000); // poll every second
    } else {
      // Re-enable button when finished
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Rebuild Summary";
      }
    }
  } catch (err) {
    console.error("Error polling rebuild progress:", err);
    setTimeout(() => pollRebuildProgress(sessionId, btn), 3000); // retry after 3s
  }
}

async function rebuildSummary(btn) {
  try {
    btn.disabled = true;
    btn.textContent = "Starting rebuild... ⏳";

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch("https://ecomops-sarar20225.onrender.com/dashboard/rebuild-summary", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    const sessionId = data.session_id;

    pollRebuildProgress(sessionId, btn); // start polling
  } catch (err) {
    console.error(err);
    alert("Failed to trigger rebuild. See console.");
    btn.disabled = false;
    btn.textContent = "Rebuild Summary";
  }
}

// Attach to button
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("rebuild-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!confirm("⚠️ This will ERASE and REBUILD all summary data. Continue?")) return;
      await rebuildSummary(btn);
    });
  }
});
