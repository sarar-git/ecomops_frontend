// dashboard.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const access_token = localStorage.getItem("sb-access-token");
  const refresh_token = localStorage.getItem("sb-refresh-token");

  if (!access_token || !refresh_token) {
    redirectToLogin();
    return;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event, session);
    if (event === 'SIGNED_OUT' || !session) {
      localStorage.clear();
      redirectToLogin();
    }
  });

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });

  if (error || !data.session) {
    console.error("Session restore failed:", error);
    redirectToLogin();
    return;
  }

  const { session } = data;
  localStorage.setItem("sb-access-token", session.access_token);
  localStorage.setItem("sb-refresh-token", session.refresh_token);

  loadDashboard(session.access_token, session.user);
  document.getElementById("logoutBtn").addEventListener("click", onLogout);
});

function redirectToLogin() {
  window.location.href = "index.html";
}

async function onLogout() {
  await supabase.auth.signOut();
  localStorage.clear();
  redirectToLogin();
}

async function loadDashboard(token, user) {
  document.getElementById("message").innerText = `Welcome, ${user.email}`;
  try {
    const res = await fetch("https://ecomops-sarar20225.onrender.com/protected", {
      headers: { Authorization: `Bearer ${token}` }
    });
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
    alert("Access denied. Please login again.");
    onLogout();
  }
}
