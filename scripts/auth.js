// scripts/auth.js
import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  let savedEmail = "";

  // 🔐 SIGNUP
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      const { email, password, name, company_name, gstin } = Object.fromEntries(formData.entries());
      const emailRedirectUrl = "https://sarar-git.github.io/ecomops_frontend/verify.html";

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        emailRedirectTo: emailRedirectUrl
      });

      if (signupError) {
        alert(signupError.message || "Signup failed.");
        return;
      }

      const user_id = signupData.user?.id;
      if (user_id) {
        const { error: insertError } = await supabase.from("users").insert([{
          user_id,
          name,
          company_name,
          gstin
        }]);

        if (insertError) {
          console.error("❌ Failed to save user details:", insertError.message);
          alert("Signup succeeded but saving profile info failed.");
        } else {
          alert("✅ Signup successful! Please check your email to confirm.");
          savedEmail = email;
          resendSection.style.display = "block"; // optional
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

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert(error.message || "Login failed.");
      } else {
        // ✅ Let Supabase handle session, no localStorage needed
        window.location.href = "dashboard.html";
      }
    });
  }
});
