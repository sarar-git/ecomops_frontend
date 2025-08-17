// dashboard.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", initDashboard);

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
async function loadSummaryCards() {
  // Show loaders for all cards
  [
    "orders-by-website",
    "shipped-card",
    "cancelled-card",
    "returned-card",
    "paid-card",
    "charges-card",
    "order-value-card", 
    "outstanding-card"
  ].forEach(showLoader);

  try {
    // 1️⃣ Fetch orders summary
    const res = await fetch("https://ecomops-sarar20225.onrender.com/dashboard/summary/");
    const websiteCounts = await res.json();

    // Render shipped, cancelled, returned status bars
    ["shipped", "cancelled", "returned"].forEach(type => {
      renderStatusRanking(type, websiteCounts);
    });

    // Render total orders per site
    const orderCountMap = Object.fromEntries(
      Object.entries(websiteCounts).map(([site, counts]) => [site, counts.total])
    );
    renderWebsiteRanking(orderCountMap, "orders-by-website");

    // 2️⃣ Fetch financial summary
    const resFinancial = await fetch("https://ecomops-sarar20225.onrender.com/dashboard/financial-summary/");
    const financialData = await resFinancial.json();

    let totalPaid = 0, totalCharges = 0, totalOrderValue = 0, totalOutstanding = 0;

    const paidMap = {};
    const chargesMap = {};
    const orderValueMap = {};
    const outstandingMap = {};

    Object.entries(financialData).forEach(([site, values]) => {
      const paid = values.paid_amount || 0;
      const charges = values.charges || 0;
      const orderVal = values.order_amount || 0;
      const outstanding = values.outstanding || 0;

      paidMap[site] = paid;
      chargesMap[site] = charges;
      orderValueMap[site] = orderVal;
      outstandingMap[site] = outstanding;

      totalPaid += paid;
      totalCharges += charges;
      totalOrderValue += orderVal;
      totalOutstanding += outstanding;
    });

    // Update totals in cards
    document.querySelector("#paid-card .value").textContent = formatCurrency(totalPaid);
    document.querySelector("#charges-card .value").textContent = formatCurrency(totalCharges);
    document.querySelector("#order-value-card .value").textContent = formatCurrency(totalOrderValue);
    document.querySelector("#outstanding-card .value").textContent = formatCurrency(totalOutstanding);

    // Render per-site bars
    renderWebsiteRanking(paidMap, "paid-card");
    renderWebsiteRanking(chargesMap, "charges-card");
    renderWebsiteRanking(orderValueMap, "order-value-card");
    renderWebsiteRanking(outstandingMap, "outstanding-card");

  } catch (err) {
    console.error("Error loading summary cards:", err);
  } finally {
    // Hide loaders for all cards
    [
      "orders-by-website",
      "shipped-card",
      "cancelled-card",
      "returned-card",
      "paid-card",
      "charges-card",
      "order-value-card",
      "outstanding-card"
    ].forEach(hideLoader);
  }
}

function formatCurrency(amount) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 2 });
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
