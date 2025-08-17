import { supabase } from "./supabaseClient.js";

const apiBase = "https://ecomops-sarar20225.onrender.com/uploads";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📦 Upload page loaded");

  const token = localStorage.getItem("sb-access-token");
  const refresh = localStorage.getItem("sb-refresh-token");

  if (!token || !refresh) {
    console.warn("❌ No tokens found in localStorage. Redirecting...");
    window.location.href = "index.html";
    return;
  }

  const { data: sessionData, error } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: refresh,
  });

  if (error || !sessionData || !sessionData.session) {
    console.error("❌ Error restoring session:", error?.message);
    localStorage.clear();
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Session restored:", sessionData.session);
  localStorage.setItem("sb-access-token", sessionData.session.access_token);
  localStorage.setItem("sb-refresh-token", sessionData.session.refresh_token);

  // 🔄 Watch for logout / token expiry
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("🔄 Auth event:", event, session);
    if (event === "SIGNED_OUT" || !session) {
      console.warn("🔒 Session ended or invalid. Redirecting...");
      localStorage.clear();
      window.location.href = "index.html";
    }
  });

  // Form and button setup
  const form = document.getElementById("uploadForm");
  const statusDiv = document.getElementById("status");

  const setupButtonGroup = (groupId, hiddenFieldName) => {
    const group = document.getElementById(groupId);
    const buttons = group.querySelectorAll("button");
    const hiddenInput = form.querySelector(`input[name="${hiddenFieldName}"]`);

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        hiddenInput.value = btn.dataset.value;
        console.log(`${hiddenFieldName} selected: ${btn.dataset.value}`);
         // Check if both Amazon and Payment Report are selected
        const website = form.querySelector(`input[name="website"]`).value;
        const reportType = form.querySelector(`input[name="report_type"]`).value;
        const codToggle = document.getElementById("codToggleWrapper");
  
        if (website === "Amazon" && reportType === "Payment Report") {
          codToggle.style.display = "block";
        } else {
          codToggle.style.display = "none";
          form.querySelector('input[name="payment_type"]').value = "";
          const codButtons = document.querySelectorAll("#codButtons button");
          codButtons.forEach((b) => b.classList.remove("active")); // clear selection
        }

      });
    });
  };

  setupButtonGroup("websiteButtons", "website");
  setupButtonGroup("reportButtons", "report_type");
  setupButtonGroup("codButtons", "payment_type");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusDiv.innerText = "";
    console.log("📨 Form submitted");

    const formData = new FormData(form);
    const website = formData.get("website");
    const report_type = formData.get("report_type");
    const start_date = formData.get("start_date");
    const end_date = formData.get("end_date");
    const file = formData.get("file");
    const payment_type = formData.get("payment_type");
    

    if (!website || !report_type || !start_date || !end_date || !file) {
      console.warn("⚠️ Missing field(s)");
      statusDiv.innerText = "❗ Please fill all fields and select a file.";
      return;
    }

    const duration = `${start_date} to ${end_date}`;
    console.log("🔍 Checking for duplicates:", { website, report_type, duration });

    try {
      const freshSession = await supabase.auth.getSession();
      const freshToken = freshSession.data?.session?.access_token;

      if (!freshToken) {
        throw new Error("No valid access token found.");
      }
      const checkRes = await fetch(
        `${apiBase}/check-duplicate?website=${encodeURIComponent(website)}&report_type=${encodeURIComponent(report_type)}&duration=${encodeURIComponent(duration)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${freshToken}`,          },
        }
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing.duplicate) {
          const confirmOverwrite = confirm(
            `A report already exists:\n📄 ID: ${existing.upload_id}\n🕒 Uploaded: ${existing.uploaded_at}\n\nDo you want to replace it?`
          );
          if (!confirmOverwrite) {
            console.log("⛔ Upload cancelled by user.");
            return;
          }
        }
      } else {
        console.warn("⚠️ Duplicate check failed with status:", checkRes.status);
      }

      console.log("📤 Uploading file...");
      const uploadData = new FormData();
      uploadData.append("website", website);
      uploadData.append("report_type", report_type);
      uploadData.append("duration", duration);
      uploadData.append("file", file);
      uploadData.append("payment_type", payment_type);

      for (const pair of uploadData.entries()) {
              console.log(`📦 Sending field: ${pair[0]} = ${pair[1]}`);
            }


      const uploadRes = await fetch(`${apiBase}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${freshToken}`,
        },
        body: uploadData,
      });

      const result = await uploadRes.json();
      console.log("📦 Upload response:", result);

      if (uploadRes.ok) {
        statusDiv.innerText = "✅ Upload successful!";
        form.reset();
        
        // ---- Add entry immediately ----
        const list = document.getElementById("fileList");
        const li = document.createElement("li");
        li.setAttribute("data-id", result.id);
        li.innerHTML = `
          <strong>${result.website}</strong> – ${result.report_type} (${result.duration})
          – <a href="${result.file_url}" target="_blank">View</a><br>
          Status: <span class="status">${result.status}</span>
          <div class="progress" style="background:#eee;width:150px;height:10px;border-radius:5px;margin-top:5px;">
            <div class="bar" style="background:#4caf50;width:0%;height:10px;border-radius:5px;"></div>
          </div>
        `;
        list.prepend(li);
  
        // ---- Poll just this upload until done ----
        const pollOne = async () => {
          const res = await fetch(`${apiBase}/uploads/list/`, {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
          if (!res.ok) return;
          const uploads = await res.json();
          const updated = uploads.find((u) => u.id === result.id);
          if (updated) {
            li.querySelector(".status").textContent = updated.status;
            if (updated.progress) {
              li.querySelector(".bar").style.width = `${updated.progress}%`;
            }
  
            // stop polling once completed/failed
            if (["completed", "failed"].includes(updated.status)) {
              clearInterval(timer);
            }
          }
        };
  
        const timer = setInterval(pollOne, 5000);
        pollOne(); // run immediately once
      } else {
        statusDiv.innerText = `❌ Upload failed: ${
          result.detail || "Unknown error"
        }`;
      }
    } catch (err) {
      console.error("🚨 Upload failed:", err);
      statusDiv.innerText = "❌ Upload failed. Please try again later.";
    }
  });
  Key imp
