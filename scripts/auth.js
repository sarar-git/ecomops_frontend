// scripts/auth.js
import { supabase } from "./supabaseClient.js";
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // 🔐 SIGNUP
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      const { email, password, name, company_name, gstin } = Object.fromEntries(formData.entries());

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        alert(error.message || "Signup failed.");
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        // Insert extra fields into 'users' table
        const { error: insertError } = await supabase.from("users").insert([
          {
            user_id: userId,
            name,
            company_name,
            gstin
          }
        ]);

        if (insertError) {
          console.error("Insert error:", insertError.message);
          alert("Signup succeeded but saving profile info failed.");
        } else {
          alert("Signup successful! Please check your email to confirm.");
          window.location.href = "index.html";
        }
      } else {
        alert("Signup succeeded, but user ID not found.");
      }
    });
  }

  // 🔐 LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const { email, password } = Object.fromEntries(formData.entries());

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert(error.message || "Login failed.");
      } else {
        localStorage.setItem("token", data.session.access_token);
        window.location.href = "dashboard.html";
      }
    });
  }
});
