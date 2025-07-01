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

  console.log("✅ Session found:", session);

  // Optionally listen for session changes (optional)
  supabase.auth.onAuthStateChange((event, newSession) => {
  console.log("🔄 Auth event:", event, newSession);
  if (event === "SIGNED_OUT" || !newSession) {
    console.warn("⚠️ Session ended, redirecting to login...");
    redirectToLogin();
  } else if (event === "TOKEN_REFRESHED") {
    console.log("🔄 Token was refreshed successfully.");
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
    const res = await fetch("https://ecomops-sarar20225.onrender.com/protected", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("🚨 Protected route status:", res.status); // 🔍 ADD THIS LINE
    if (!res.ok) throw new Error("Unauthorized");

    const uploadsRes = await fetch("https://ecomops-sarar20225.onrender.com/uploads/list", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const uploads = await uploadsRes.json();
    const list = document.getElementById("fileList");
    uploads.forEach(u => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${u.website}</strong> – ${u.report_type} (${u.duration}) – <a href="${u.file_url}" target="_blank">View</a>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("⚠️ Error loading dashboard:", err);
    alert("Access denied. Please login again.");
    onLogout();
  }
}
