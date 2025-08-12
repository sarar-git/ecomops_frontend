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
async function loadSummaryCards() {
  try {
    // Define the platforms and their tables
    const platforms = [
      { name: 'Amazon', table: 'amazon_master_orders', statusCol: 'status' },
      { name: 'Jiomart', table: 'jiomart_master_orders', statusCol: 'order_status' }
    ];

    const websiteCounts = {};

    // Fetch counts per platform
    for (const platform of platforms) {
      const { data, error } = await supabase
        .from(platform.table)
        .select(`${platform.statusCol}`, { count: 'exact', head: false });

      if (error) {
        console.error(`❌ Error loading ${platform.name} data:`, error);
        continue;
      }

      // Initialize counts
      websiteCounts[platform.name] = {
        shipped: 0,
        cancelled: 0,
        returned: 0,
        total: 0
      };

      // Aggregate counts
      data.forEach(row => {
        const status = String(row[platform.statusCol] || '').toLowerCase();
        websiteCounts[platform.name].total++;
        if (status.includes('shipped')) websiteCounts[platform.name].shipped++;
        else if (status.includes('cancelled')) websiteCounts[platform.name].cancelled++;
        else if (status.includes('returned')) websiteCounts[platform.name].returned++;
      });
    }

    // Update cards for each website
    Object.entries(websiteCounts).forEach(([site, counts]) => {
      setCard(`${site.toLowerCase()}-shipped-card`, `
        <h3>${site} Shipped</h3>
        <p>${counts.shipped.toLocaleString()}</p>
      `);
      setCard(`${site.toLowerCase()}-cancelled-card`, `
        <h3>${site} Cancelled</h3>
        <p>${counts.cancelled.toLocaleString()}</p>
      `);
      setCard(`${site.toLowerCase()}-returned-card`, `
        <h3>${site} Returned</h3>
        <p>${counts.returned.toLocaleString()}</p>
      `);
    });

    // Also render the orders-by-website bar chart
    const orderCountMap = {};
    for (const [site, counts] of Object.entries(websiteCounts)) {
      orderCountMap[site] = counts.total;
    }
    renderWebsiteRanking(orderCountMap);

  } catch (err) {
    console.error('❌ Error loading summary cards:', err);
  }
}
function renderWebsiteRanking(websiteCounts) {
  // Find the container *inside* the Orders by Website card
  const siteList = document.querySelector('#orders-by-website .site-ranking');

  if (!siteList) {
    console.warn("⚠️ .site-ranking element not found inside Orders by Website card.");
    return;
  }

  // Sort platforms by highest order count
  const sortedSites = Object.entries(websiteCounts)
    .sort((a, b) => b[1] - a[1]);

  // Clear previous render
  siteList.innerHTML = '';

  // Max value for scaling bars
  const maxCount = sortedSites[0]?.[1] || 1;

  // Render each website row
  sortedSites.forEach(([site, count]) => {
    const percentage = (count / maxCount) * 100; // auto-scale bar
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
