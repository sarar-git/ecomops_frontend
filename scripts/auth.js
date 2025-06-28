// auth.js

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // 🔐 Signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      const { email, password } = Object.fromEntries(formData.entries());

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        alert(error.message || "Signup failed.");
      } else {
        alert("Signup successful! Please check your email to confirm.");
        window.location.href = "index.html";
      }
    });
  }

  // 🔐 Login
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
        localStorage.setItem("token", data.session.access_token);  // Save the access token
        window.location.href = "dashboard.html";
      }
    });
  }
});
