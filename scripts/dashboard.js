// dashboard.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📦 Checking current session...");

  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log("🔑 Current session:", session);

  if (error || !session) {
    console.error("❌ No session found or error:", error);
    redirectToLogin();
    return;
  }
  // ✅ STORE TOKENS IN LOCAL STORAGE
  localStorage.setItem("sb-access-token", session.access_token);
  localStorage.setItem("sb-refresh-token", session.refresh_token);

  console.log("✅ Session found:", session);

  // Optionally listen for session changes (optional)
  supabase.auth.onAuthStateChange((event, newSession) => {
  console.log("🔄 Auth event:", event, newSession);
  if (event === "SIGNED_OUT" || !newSession) {
    console.warn("⚠️ Session ended, redirecting to login...");
    redirectToLogin();
  } else if (event === "TOKEN_REFRESHED") {
    console.log("🔄 Token was refreshed successfully.");
    localStorage.setItem("sb-access-token", newSession.access_token);
    localStorage.setItem("sb-refresh-token", newSession.refresh_token);
  }
});
  loadDashboard(session.access_token, session.user);
  document.getElementById("logoutBtn").addEventListener("click", onLogout);
});

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
    console.log("🚨 Protected route status:", res.status); // 🔍 ADD THIS LINE
    if (!res.ok) throw new Error("Unauthorized");
  } catch (err) {
    console.error("⚠️ Error loading dashboard:", err);
    alert("Access denied. Please login again.");
    onLogout();
  }
  // Fetch and display lifetime dashboard data from function for cards
  try {
    await loadSummaryCards();
  } catch (err) {
    console.error("⚠️ Error loading summary cards:", err);
    // You might show a fallback message on the page instead of alert
  }
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
    // Optionally show a message on the UI
  }
}

// function for cards
async function loadSummaryCards() {
  const shipped = { count: 0, value: 0 };
  const cancelled = { count: 0, value: 0 };
  const returned = { count: 0, value: 0 };

  const { data: amazonOrders, error: aoError } = await supabase
    .from('amazon_master_orders')
    .select('status, total_paid');

  if (aoError) {
    console.error("❌ Error fetching Amazon orders:", aoError);
    return;
  }

  const { data: jiomartOrders, error: joError } = await supabase
    .from('jiomart_master_orders')
    .select('order_status, pay_net_amount');

  if (joError) {
    console.error("❌ Error fetching Jiomart orders:", joError);
    return;
  }

  // Combine for status calculations
  const allOrders = [
    ...amazonOrders.map(o => ({ status: o.status, value: Number(o.total_paid) || 0 })),
    ...jiomartOrders.map(o => ({ status: o.order_status, value: Number(o.pay_net_amount) || 0 }))
  ];

  for (const order of allOrders) {
    if (order.status === 'SHIPPED') {
      shipped.count++;
      shipped.value += order.value;
    } else if (order.status === 'CANCELLED') {
      cancelled.count++;
      cancelled.value += order.value;
    } else if (order.status === 'RETURNED') {
      returned.count++;
      returned.value += order.value;
    }
  }

  const { data: amazonPay, error: apError } = await supabase
    .from('amazon_payment_statements')
    .select('total_amount');

  if (apError) {
    console.error("❌ Error fetching Amazon payments:", apError);
    return;
  }

  const { data: jiomartPay, error: jpError } = await supabase
    .from('jiomart_unmatched_payment') // change later to jiomart_payment_statements
    .select('net_amount');

  if (jpError) {
    console.error("❌ Error fetching Jiomart payments:", jpError);
    return;
  }

  const paid = [
    ...amazonPay.map(r => Number(r.total_amount) || 0),
    ...jiomartPay.map(r => Number(r.net_amount) || 0)
  ].reduce((sum, val) => sum + val, 0);

  const charges = 300000; // static for now
  const outstanding = paid - charges;

  // ✅ Update UI cards
  document.getElementById('shipped-card').innerHTML = `
    <h3>Shipped Orders</h3>
    <p>${shipped.count}</p>
    <small>₹${shipped.value.toLocaleString()}</small>`;
  document.getElementById('cancelled-card').innerHTML = `
    <h3>Cancelled Orders</h3>
    <p>${cancelled.count}</p>
    <small>₹${cancelled.value.toLocaleString()}</small>`;
  document.getElementById('returned-card').innerHTML = `
    <h3>Returned Orders</h3>
    <p>${returned.count}</p>
    <small>₹${returned.value.toLocaleString()}</small>`;
  document.getElementById('paid-card').innerHTML = `
    <h3>Total Paid</h3><p>₹${paid.toLocaleString()}</p>`;
  document.getElementById('charges-card').innerHTML = `
    <h3>Total Charges</h3><p>₹${charges.toLocaleString()}</p>`;
  document.getElementById('outstanding-card').innerHTML = `
    <h3>Outstanding</h3><p>₹${outstanding.toLocaleString()}</p>`;

  // 📊 Website ranking data
  const websiteCounts = {
    Amazon: amazonOrders.length,
    Jiomart: jiomartOrders.length
  };

  const sortedSites = Object.entries(websiteCounts)
    .sort((a, b) => b[1] - a[1]); // sort by order count desc

  const siteList = document.getElementById('site-ranking');
  siteList.innerHTML = '';
  const maxCount = sortedSites[0]?.[1] || 1;

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
