import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const access_token = localStorage.getItem("sb-access-token");
  const refresh_token = localStorage.getItem("sb-refresh-token");

  if (!access_token || !refresh_token) {
    console.warn("No tokens found, redirecting to login...");
    redirectToLogin();
    return;
  }

  // ✅ Refresh session to keep access_token valid
  const { data: sessionData, error } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });

  if (error || !sessionData.session) {
    console.error("Session refresh failed:", error?.message);
    redirectToLogin();
    return;
  }

  const newAccessToken = sessionData.session.access_token;
  const user = sessionData.session.user;

  // ✅ Store refreshed token (optional but recommended)
  localStorage.setItem("sb-access-token", newAccessToken);

  // ✅ Load protected data
  loadDashboard(newAccessToken, user);

  // ✅ Setup logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    redirectToLogin();
  });
});

function redirectToLogin() {
  window.location.href = "index.html";
}

async function loadDashboard(token, user) {
  // ✅ Show user email
  document.getElementById("message").innerText = `Welcome! ${user.email}`;

  // 🔐 Fetch from protected backend
  try {
    const res = await fetch("https://ecomops-sarar20225.onrender.com/protected", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Unauthorized");

    const userData = await res.json();
    console.log("✅ Authenticated user:", userData);

    // 🧾 Load uploaded files
    const fileRes = await fetch("https://ecomops-sarar20225.onrender.com/uploads/list", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const uploads = await fileRes.json();
    const list = document.getElementById("fileList");
    uploads.forEach(upload => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${upload.website}</strong> - ${upload.report_type} (${upload.duration}) 
        <a href="${upload.file_url}" target="_blank">View</a>
      `;
      list.appendChild(item);
    });

  } catch (err) {
    alert("Access denied. Please login again.");
    localStorage.clear();
    redirectToLogin();
  }
}
