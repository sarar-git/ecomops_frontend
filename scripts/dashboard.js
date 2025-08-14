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
      const li = document.createElement("li");
      li.innerHTML = `<strong>${u.website}</strong> – ${u.report_type} (${u.duration}) – <a href="${u.file_url}" target="_blank">View</a>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("⚠️ Error loading uploads:", err);
  }
}
//Loader functions
function showLoader(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.add("loading");
    card.innerHTML = `<div class="loader"></div>`; // Replace card content with spinner
  }
}

function hideLoader(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.remove("loading");
  }
}

async function loadSummaryCards() {
  try {
    
    // 🌀 Show loaders for all summary cards
    showLoader("orders-by-website");
    showLoader("shipped-card");
    showLoader("cancelled-card");
    showLoader("returned-card");
    
    const platforms = [
      { name: 'Amazon', table: 'amazon_master_orders', statusCol: 'status' },
      { name: 'Jiomart', table: 'jiomart_master_orders', statusCol: 'order_status' }
    ];

    const websiteCounts = {};

    for (const platform of platforms) {
      websiteCounts[platform.name] = { shipped: 0, cancelled: 0, returned: 0, total: 0 };

      // ✅ Total count
      const { count: totalCount, error: totalError } = await supabase
        .from(platform.table)
        .select('*', { count: 'exact', head: true });

      if (!totalError) websiteCounts[platform.name].total = totalCount || 0;

      // ✅ Shipped count
      const { count: shippedCount, error: shippedError } = await supabase
        .from(platform.table)
        .select('*', { count: 'exact', head: true })
        .ilike(platform.statusCol, '%shipped%');

      if (!shippedError) websiteCounts[platform.name].shipped = shippedCount || 0;

      // ✅ Cancelled count
      const { count: cancelledCount, error: cancelledError } = await supabase
        .from(platform.table)
        .select('*', { count: 'exact', head: true })
        .ilike(platform.statusCol, '%cancelled%');

      if (!cancelledError) websiteCounts[platform.name].cancelled = cancelledCount || 0;

      // ✅ Returned count
      const { count: returnedCount, error: returnedError } = await supabase
        .from(platform.table)
        .select('*', { count: 'exact', head: true })
        .ilike(platform.statusCol, '%returned%');

      if (!returnedError) websiteCounts[platform.name].returned = returnedCount || 0;
    }

    // Render each status type card
    ['shipped', 'cancelled', 'returned'].forEach(statusType => {
      renderStatusRanking(statusType, websiteCounts);
    });

    // Render orders-by-website card
    const orderCountMap = Object.fromEntries(
      Object.entries(websiteCounts).map(([site, counts]) => [site, counts.total])
    );
    renderWebsiteRanking(orderCountMap);

  } catch (err) {
    console.error('❌ Error loading summary cards:', err);
  } finally {
  // ✅ Hide loaders once everything is rendered
  hideLoader("orders-by-website");
  hideLoader("shipped-card");
  hideLoader("cancelled-card");
  hideLoader("returned-card");
  }
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

// 📊 Existing renderer for total orders
function renderWebsiteRanking(websiteCounts) {
  const siteList = document.querySelector('#orders-by-website .site-ranking');

  if (!siteList) {
    console.warn("⚠️ .site-ranking element not found inside Orders by Website card.");
    return;
  }

  const sortedSites = Object.entries(websiteCounts)
    .sort((a, b) => b[1] - a[1]);

  siteList.innerHTML = ''; 
  const counts = sortedSites.map(([, count]) => count);
  const maxCount = counts.length ? Math.max(...counts) : 1;
  console.log("Sorted sites:", sortedSites);
  console.log("Max count:", maxCount);


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
