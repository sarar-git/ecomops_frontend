const token = localStorage.getItem("token");
const protectedEndpoint = "https://ecomops-sarar20225.onrender.com/protected"; // Change if needed

document.addEventListener("DOMContentLoaded", async () => {
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const res = await fetch(protectedEndpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  if (res.ok) {
    document.getElementById("message").innerText = `Welcome! ${data.user.email}`;
  } else {
    alert("Access denied. Please login again.");
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
});
