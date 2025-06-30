import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Step 1: Try to get an existing session (persistent via cookies or memory)
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (session) {
    // Session is already valid, use it
    console.log("✅ Existing session found.");
    localStorage.setItem("sb-access-token", session.access_token);
    localStorage.setItem("sb-refresh-token", session.refresh_token);
    loadDashboard(session.access_token, session.user);
  } else {
    // No session found, try restoring it using saved tokens
    const access_token = localStorage.getItem("sb-access-token");
    const refresh_token = localStorage.getItem("sb-refresh-token");

    if (!access_token || !refresh_token) {
      console.warn("No tokens found, redirecting to login...");
      return redirectToLogin();
    }

    // ✅ Try to restore session
    const { data: sessionData, error: restoreError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (restoreError || !sessionData.session) {
      console.error("❌ Session restoration failed:", restoreError?.message);
      return redirectToLogin();
    }

    // ✅ Save refreshed tokens and continue
    localStorage.setItem("sb-access-token", sessionData.session.access_token);
    localStorage.setItem("sb-refresh-token", sessionData.session.refresh_token);
    loadDashboard(sessionData.session.access_token, sessionData.session.user);
  }

  // ✅ Monitor auth state changes
  supabase.auth.onAuthStateChange((event, newSession) => {
    console.log("🔄 Auth state changed:", event, newSession);

    if (!newSession) {
      // User signed out or session expired
      localStorage.clear();
      redirectToLogin();
    } else {
      // Save new tokens
      localStorage.setItem("sb-access-token", newSession.access_token);
      localStorage.setItem("sb-refresh-token", newSession.refresh_token);
    }
  });

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
