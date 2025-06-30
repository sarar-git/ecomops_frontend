// dashboard.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    console.warn("❌ No active session found.");
    redirectToLogin();
    return;
  }

  // ✅ Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("🔄 Auth state changed:", event, session);
    if (!session) {
      redirectToLogin();
    }
  });

  // ✅ Load dashboard
  loadDashboard(session.access_token, session.user);

  // ✅ Logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    redirectToLogin();
  });
});

function redirectToLogin() {
  window.location.href = "index.html"; // or login.html depending on your structure
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
      headers: { Authorization: `Bearer ${token}` }
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
    redirectToLogin();
  }
}
