// scripts/forgot-password.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotPasswordForm");
  const message = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://sarar-git.github.io/ecomops_frontend/forgot-password.html" // change to your actual reset URL
    });

    if (error) {
      message.textContent = `❌ Error: ${error.message}`;
      message.style.color = 'red';
    } else {
      message.textContent = "✅ Reset link sent! Please check your email.";
      message.style.color = 'green';
      form.reset();
    }
  });
});
