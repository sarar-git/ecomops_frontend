import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (!session) {
    console.warn("No session found. Redirecting...");
    return redirectToLogin();
  }

  // 🟢 Keep tokens up to date
  await refreshTokenIfNeeded();

  // 🟢 Auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔄 Auth state changed:", event, session);
    if (!session) {
      localStorage.clear();
      return redirectToLogin();
    }

    // Refresh tokens in storage
    localStorage.setItem("sb-access-token", session.access_token);
    localStorage.setItem("sb-refresh-token", session.refresh_token);
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    redirectToLogin();
  });

  // ✅ Load dashboard
  loadDashboard();
});

function redirectToLogin() {
  window.location.href = "index.html";
}

async function refreshTokenIfNeeded() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { access_token, refresh_token } = session;
    localStorage.setItem("sb-access-token", access_token);
    localStorage.setItem("sb-refresh-token", refresh_token);
  }
}

async function loadDashboard() {
  const token = localStorage.getItem("sb-access-token");

  try {
    const res = await fetch("https://ecomops-sarar20225.onrender.com/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Unauthorized");

    const data = await res.json();
    document.getElementById("message").innerText = `Welcome! ${data.user[0]?.email ?? 'user'}`;

    // Load uploads
    const fileRes = await fetch("https://ecomops-sarar20225.onrender.com/uploads/list", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const uploads = await fileRes.json();
    const list = document.getElementById("fileList");
    list.innerHTML = ""; // clear before reloading
    uploads.forEach(upload => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${upload.website}</strong> - ${upload.report_type} (${upload.duration}) 
        <a href="${upload.file_url}" target="_blank">View</a>
      `;
      list.appendChild(item);
    });

  } catch (err) {
    console.error("❌ Error loading dashboard:", err.message);
    alert("Access denied. Please login again.");
    localStorage.clear();
    redirectToLogin();
  }
}
