// reset-password.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = new FormData(form).get("newPassword");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert("❌ Failed to reset password: " + error.message);
    } else {
      alert("✅ Password has been reset. You can now log in.");
      window.location.href = "index.html";
    }
  });
});
