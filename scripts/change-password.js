// change-password.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("changeForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData?.user?.email;

    if (userError || !email) {
      alert("❌ You must be logged in to change your password.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      alert("❌ Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      alert("❌ Failed to change password: " + updateError.message);
    } else {
      alert("✅ Password changed successfully!");
      form.reset();
    }
  });
});
