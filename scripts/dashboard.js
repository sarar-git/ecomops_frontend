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

    const uploadsRes = await fetch("https://ecomops-sarar20225.onrender.com/uploads/list/", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const uploads = await uploadsRes.json();
    const list = document.getElementById("fileList");
    uploads.forEach(u => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${u.website}</strong> – ${u.report_type} (${u.duration}) – <a href="${u.file_url}" target="_blank">View</a>`;
      list.appendChild(li);
    });
    // Fetch and display lifetime dashboard data from function for cards
    await loadSummaryCards();

  } catch (err) {
    console.error("⚠️ Error loading dashboard:", err);
    alert("Access denied. Please login again.");
    onLogout();
  }
}

// function for cards
async function loadSummaryCards() {
  const shipped = { count: 0, value: 0 };
  const cancelled = { count: 0, value: 0 };
  const returned = { count: 0, value: 0 };

  const amazonOrders = await supabase.from('AmazonMasterOrder').select('order_status, order_total_amount');
  const jiomartOrders = await supabase.from('JiomartMasterOrder').select('order_status, order_total_amount');

  const allOrders = [...amazonOrders.data, ...jiomartOrders.data];

  for (const order of allOrders) {
    const val = Number(order.order_total_amount) || 0;
    if (order.order_status === 'SHIPPED') {
      shipped.count++;
      shipped.value += val;
    } else if (order.order_status === 'CANCELLED') {
      cancelled.count++;
      cancelled.value += val;
    } else if (order.order_status === 'RETURNED') {
      returned.count++;
      returned.value += val;
    }
  }

  const amazonPay = await supabase.from('amazon_payment_reports').select('amount');
  const jiomartPay = await supabase.from('jiomart_payment_reports').select('amount');

  const paid = [...amazonPay.data, ...jiomartPay.data].reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const charges = 300000; // TODO: calculate dynamically later
  const outstanding = paid - charges;

  // Update DOM
  document.getElementById('shipped-card').innerHTML = `
    <h3>Shipped Orders</h3><p>${shipped.count}</p><small>₹${shipped.value.toLocaleString()}</small>`;
  document.getElementById('cancelled-card').innerHTML = `
    <h3>Cancelled Orders</h3><p>${cancelled.count}</p><small>₹${cancelled.value.toLocaleString()}</small>`;
  document.getElementById('returned-card').innerHTML = `
    <h3>Returned Orders</h3><p>${returned.count}</p><small>₹${returned.value.toLocaleString()}</small>`;
  document.getElementById('paid-card').innerHTML = `
    <h3>Total Paid</h3><p>₹${paid.toLocaleString()}</p>`;
  document.getElementById('charges-card').innerHTML = `
    <h3>Total Charges</h3><p>₹${charges.toLocaleString()}</p>`;
  document.getElementById('outstanding-card').innerHTML = `
    <h3>Outstanding</h3><p>₹${outstanding.toLocaleString()}</p>`;
}
