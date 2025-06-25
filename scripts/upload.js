const apiBase = "https://ecomops-sarar20225.onrender.com/uploads";

const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "index.html"; // Redirect to login
}


document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("uploadForm");
  const statusDiv = document.getElementById("status");

  // Button selection logic
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

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first.");
      window.location.href = "index.html";
      return;
    }

    const formData = new FormData(form);
    const website = formData.get("website");
    const report_type = formData.get("report_type");
    const start_date = formData.get("start_date");
    const end_date = formData.get("end_date");
    const file = formData.get("file");

    const duration = `${start_date} to ${end_date}`;

    // Step 1: Check for duplicates
    const checkRes = await fetch(
      `${apiBase}/check-duplicate?website=${website}&report_type=${report_type}&duration=${duration}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.exists) {
        const confirmOverwrite = confirm(
          `A report already exists:\nFile ID: ${existing.id}\nUploaded: ${existing.uploaded_at}\n\nReplace it?`
        );
        if (!confirmOverwrite) return;
      }
    }

    // Step 2: Upload
    const uploadData = new FormData();
    uploadData.append("website", website);
    uploadData.append("report_type", report_type);
    uploadData.append("duration", duration);
    uploadData.append("file", file);

    const uploadRes = await fetch(`${apiBase}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadData,
    });

    const result = await uploadRes.json();
    if (uploadRes.ok) {
      statusDiv.innerText = "✅ Upload successful!";
    } else {
      statusDiv.innerText = `❌ Upload failed: ${result.detail}`;
    }
  });
});
