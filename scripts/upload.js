import { supabase } from "./supabaseClient.js";

let token = null; // <-- declare globally

(async () => {
  const access = localStorage.getItem("sb-access-token");
  const refresh = localStorage.getItem("sb-refresh-token");
  const apiBase = "https://ecomops-sarar20225.onrender.com/uploads";

  if (!access || !refresh) {
    window.location.href = "index.html";
    return;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });

  if (error) {
    console.error("Session refresh error:", error.message);
    localStorage.clear();
    window.location.href = "index.html";
    return;
  }

  // ✅ Store updated token globally
  token = data.session.access_token;
  localStorage.setItem("sb-access-token", token);
  localStorage.setItem("sb-refresh-token", data.session.refresh_token);

  // ✅ Proceed only after session refresh is done
  initUploadForm(apiBase);
})();
function initUploadForm(apiBase) {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("uploadForm");
    const statusDiv = document.getElementById("status");

    const setupButtonGroup = (groupId, hiddenFieldName) => {
      const group = document.getElementById(groupId);
      const buttons = group.querySelectorAll("button");
      const hiddenInput = form.querySelector(`input[name="${hiddenFieldName}"]`);
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          hiddenInput.value = btn.dataset.value;
        });
      });
    };

    setupButtonGroup("websiteButtons", "website");
    setupButtonGroup("reportButtons", "report_type");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const website = formData.get("website");
      const report_type = formData.get("report_type");
      const start_date = formData.get("start_date");
      const end_date = formData.get("end_date");
      const file = formData.get("file");

      if (!website || !report_type || !start_date || !end_date || !file) {
        statusDiv.innerText = "❗ Please fill all fields and select a file.";
        return;
      }

      const duration = `${start_date} to ${end_date}`;

      // ✅ Use updated token
      try {
        const checkRes = await fetch(
          `${apiBase}/check-duplicate?website=${encodeURIComponent(website)}&report_type=${encodeURIComponent(report_type)}&duration=${encodeURIComponent(duration)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (existing.exists) {
            const confirmOverwrite = confirm(
              `A report already exists:\n\n📄 File ID: ${existing.id}\n🕒 Uploaded: ${existing.uploaded_at}\n\nDo you want to replace it?`
            );
            if (!confirmOverwrite) return;
          }
        }
      } catch (err) {
        console.error("Error checking duplicates:", err);
        statusDiv.innerText = "⚠️ Failed to check for duplicates.";
        return;
      }

      const uploadData = new FormData();
      uploadData.append("website", website);
      uploadData.append("report_type", report_type);
      uploadData.append("duration", duration);
      uploadData.append("file", file);

      try {
        const uploadRes = await fetch(`${apiBase}/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadData,
        });

        const result = await uploadRes.json();

        if (uploadRes.ok) {
          statusDiv.innerText = "✅ Upload successful!";
          form.reset();
        } else {
          statusDiv.innerText = `❌ Upload failed: ${result.detail || "Unknown error"}`;
        }
      } catch (err) {
        console.error("Upload failed:", err);
        statusDiv.innerText = "❌ Upload failed. Please try again later.";
      }
    });
  });
}
