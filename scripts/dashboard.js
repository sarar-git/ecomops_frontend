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
  const shipped = { count: 0, value: 0 };
  const cancelled = { count: 0, value: 0 };
  const returned = { count: 0, value: 0 };

  const { data: amazonOrders, error: aoError } = await supabase
    .from('amazon_master_orders')
    .select('status, total_paid');
  if (aoError) return console.error("❌ Error fetching Amazon orders:", aoError);

  const { data: jiomartOrders, error: joError } = await supabase
    .from('jiomart_master_orders')
    .select('order_status, pay_net_amount');
  if (joError) return console.error("❌ Error fetching Jiomart orders:", joError);

  // Merge orders and compute counts
  [...amazonOrders.map(o => ({ status: o.status, value: +o.total_paid || 0 })),
   ...jiomartOrders.map(o => ({ status: o.order_status, value: +o.pay_net_amount || 0 }))
  ].forEach(order => {
    if (order.status === 'SHIPPED') { shipped.count++; shipped.value += order.value; }
    else if (order.status === 'CANCELLED') { cancelled.count++; cancelled.value += order.value; }
    else if (order.status === 'RETURNED') { returned.count++; returned.value += order.value; }
  });

  // Payments
  const { data: amazonPay, error: apError } = await supabase
    .from('amazon_payment_statements')
    .select('total_amount');
  if (apError) return console.error("❌ Error fetching Amazon payments:", apError);

  const { data: jiomartPay, error: jpError } = await supabase
    .from('jiomart_unmatched_payment') // TODO: Change when ready
    .select('net_amount');
  if (jpError) return console.error("❌ Error fetching Jiomart payments:", jpError);

  const paid = [...amazonPay.map(r => +r.total_amount || 0),
                ...jiomartPay.map(r => +r.net_amount || 0)]
                .reduce((sum, val) => sum + val, 0);

  const charges = 300000; // static placeholder
  const outstanding = paid - charges;

  // Render cards
  setCard('shipped-card', `<h3>Shipped Orders</h3><p>${shipped.count}</p><small>₹${shipped.value.toLocaleString()}</small>`);
  setCard('cancelled-card', `<h3>Cancelled Orders</h3><p>${cancelled.count}</p><small>₹${cancelled.value.toLocaleString()}</small>`);
  setCard('returned-card', `<h3>Returned Orders</h3><p>${returned.count}</p><small>₹${returned.value.toLocaleString()}</small>`);
  setCard('paid-card', `<h3>Total Paid</h3><p>₹${paid.toLocaleString()}</p>`);
  setCard('charges-card', `<h3>Total Charges</h3><p>₹${charges.toLocaleString()}</p>`);
  setCard('outstanding-card', `<h3>Outstanding</h3><p>₹${outstanding.toLocaleString()}</p>`);

  // Website ranking
  renderWebsiteRanking({
    Amazon: amazonOrders.length,
    Jiomart: jiomartOrders.length
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
