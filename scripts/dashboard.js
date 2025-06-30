import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const access_token = localStorage.getItem("sb-access-token");
  const refresh_token = localStorage.getItem("sb-refresh-token");

  if (!access_token || !refresh_token) {
    console.warn("No tokens found, redirecting to login...");
    redirectToLogin();
    return;
  }

  // ✅ Monitor auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event, session);
    if (!session) {
      localStorage.clear();
      redirectToLogin();
    }
  });

  // ✅ Refresh session
  const { data: sessionData, error } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });

  if (error || !sessionData.session) {
    console.error("Session restoration failed:", error?.message);
    redirectToLogin();
    return;
  }

  // ✅ Store fresh tokens
  localStorage.setItem("sb-access-token", sessionData.session.access_token);
  localStorage.setItem("sb-refresh-token", sessionData.session.refresh_token);

  // ✅ Load dashboard data
  loadDashboard(sessionData.session.access_token, sessionData.session.user);

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
  document.getElementById("message").innerText = `Welcome! ${user.email}`;

  try {
    const res = await fetch("https://ecomops-sarar20225.onrender.com/protected", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Unauthorized");

    const userData = await res.json();
    console.log("✅ Authenticated user:", userData);

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
