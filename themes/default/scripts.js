document.addEventListener("DOMContentLoaded", () => {
  document.dispatchEvent(new CustomEvent("spot:page-load"));

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!(form instanceof HTMLFormElement)) return;

      const email = form.email.value;
      const password = form.password.value;
      const errorEl = document.getElementById("login-error");

      try {
        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = data.message ?? "Login failed. Check your credentials.";
          }
          return;
        }

        window.location.href = "/admin";
      } catch {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Network error. Please try again.";
        }
      }
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/auth/sign-out", { method: "POST" });
      window.location.href = "/";
    });
  }
});
