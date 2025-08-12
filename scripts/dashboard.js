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

function setCard(id, html) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`⚠️ Element #${id} not found`);
    return;
  }
  el.innerHTML = html;
}

async function loadSummaryCards() {
  try {
    // Fetch counts & totals grouped by status + platform
    const { data: orderStats, error: statsError } = await supabase
      .from('orders') // replace with your combined orders view or table
      .select(`
        platform,
        status,
        count:count(*),
        total_value:sum(order_value)
      `, { count: 'exact' })
      .group('platform, status');

    if (statsError) throw statsError;

    // Process into summary cards + ranking
    let websiteCounts = {};
    let shipped = { count: 0, value: 0 };
    let cancelled = { count: 0, value: 0 };
    let returned = { count: 0, value: 0 };

    orderStats.forEach(row => {
      const platform = row.platform;
      const count = row.count || 0;
      const value = row.total_value || 0;

      // Track per platform total orders
      websiteCounts[platform] = (websiteCounts[platform] || 0) + count;

      // Populate shipped / cancelled / returned totals
      if (row.status === 'shipped') {
        shipped.count += count;
        shipped.value += value;
      }
      if (row.status === 'cancelled') {
        cancelled.count += count;
        cancelled.value += value;
      }
      if (row.status === 'returned') {
        returned.count += count;
        returned.value += value;
      }
    });

    // Fetch payments summary
    const { data: paymentStats, error: payError } = await supabase
      .from('payments')
      .select(`
        total_paid:sum(paid_amount),
        total_charges:sum(charges_amount)
      `);

    if (payError) throw payError;

    const paid = paymentStats[0]?.total_paid || 0;
    const charges = paymentStats[0]?.total_charges || 0;
    const outstanding = paid - charges;

    // Render cards
    setCard('shipped-card', `<h3>Shipped Orders</h3><p>${shipped.count}</p><small>₹${shipped.value.toLocaleString()}</small>`);
    setCard('cancelled-card', `<h3>Cancelled Orders</h3><p>${cancelled.count}</p><small>₹${cancelled.value.toLocaleString()}</small>`);
    setCard('returned-card', `<h3>Returned Orders</h3><p>${returned.count}</p><small>₹${returned.value.toLocaleString()}</small>`);
    setCard('paid-card', `<h3>Total Paid</h3><p>₹${paid.toLocaleString()}</p>`);
    setCard('charges-card', `<h3>Total Charges</h3><p>₹${charges.toLocaleString()}</p>`);
    setCard('outstanding-card', `<h3>Outstanding</h3><p>₹${outstanding.toLocaleString()}</p>`);

    // Render website ranking bars inside "Orders by Website" card
    renderWebsiteRanking(websiteCounts);

  } catch (err) {
    console.error("❌ Error loading summary cards:", err);
  }
}

function setCard(id, content) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = content;
}

function renderWebsiteRanking(websiteCounts) {
  const container = document.getElementById('platformList');
  if (!container) return;

  container.innerHTML = '';
  const sortedSites = Object.entries(websiteCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedSites[0]?.[1] || 1;

  sortedSites.forEach(([site, count]) => {
    const percentage = (count / maxCount) * 100;
    container.innerHTML += `
      <div class="site-row">
        <span class="site-name">${site}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percentage}%;"></div>
        </div>
        <span class="site-count">${count.toLocaleString()}</span>
      </div>
    `;
  });
}

function renderWebsiteRanking(websiteCounts) {
  // Sort websites by order count (highest first)
  const sortedSites = Object.entries(websiteCounts).sort((a, b) => b[1] - a[1]);

  // Target the container inside "Orders by Website" card
  const siteList = document.getElementById('site-ranking');
  if (!siteList) {
    console.warn("⚠️ #site-ranking element not found in Orders by Website card. Skipping render.");
    return;
  }

  siteList.innerHTML = '';

  // Find the largest order count for scaling the bars
  const maxCount = sortedSites[0]?.[1] || 1;

  // Build the progress bars
  sortedSites.forEach(([site, count]) => {
    const percentage = (count / maxCount) * 100;
    siteList.innerHTML += `
      <div class="site-row">
        <span class="site-name">${site}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percentage}%;"></div>
        </div>
        <span class="site-count">${count}</span>
      </div>
    `;
  });
}
