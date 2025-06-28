import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotPasswordForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(form).get("email");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://sarar-git.github.io/ecomops_frontend//reset-password.html", // replace with actual URL
    });

    if (error) {
      alert("❌ Failed to send reset email: " + error.message);
    } else {
      alert("📧 Reset email sent! Check your inbox.");
      form.reset();
    }
  });
});
