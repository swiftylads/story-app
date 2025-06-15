export class AuthView {
  constructor() {
    this.loginForm = document.getElementById("login-form");
    this.registerForm = document.getElementById("register-form");
    this.logoutBtn = document.getElementById("logout-btn");
  }

  bindLogin(handler) {
    if (!this.loginForm) return;

    this.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const formData = new FormData(this.loginForm);
      const email = formData.get("email");
      const password = formData.get("password");

      if (!email || !password) {
        this.showError("Email dan password wajib diisi!");
        return;
      }

      const submitBtn = this.loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";

      try {
        await handler(email, password);

        this.loginForm.reset();
      } catch (error) {
        this.showError("Login gagal: " + error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  bindRegister(handler) {
    if (!this.registerForm) return;

    this.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const formData = new FormData(this.registerForm);
      const name = formData.get("name");
      const email = formData.get("email");
      const password = formData.get("password");

      if (!name || !email || !password) {
        this.showError("Semua kolom harus diisi!");
        return;
      }

      if (password.length < 8) {
        this.showError("Password minimal 8 karakter!");
        return;
      }

      const submitBtn = this.registerForm.querySelector(
        'button[type="submit"]'
      );
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Registering...";

      try {
        await handler(name, email, password);

        this.registerForm.reset();
      } catch (error) {
        this.showError("Registrasi gagal: " + error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  bindLogout(handler) {
    if (!this.logoutBtn) return;

    this.logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (confirm("Apakah Anda yakin ingin logout?")) {
        handler();
      }
    });
  }

  updateAuthState(isAuthenticated) {
    const authElements = document.querySelectorAll(".auth-only");
    const authRequired = document.querySelectorAll(".auth-required");
    const loginNav = document.getElementById("login-nav");
    const registerNav = document.getElementById("register-nav");

    if (isAuthenticated) {
      authElements.forEach((el) => {
        el.classList.add("authenticated");
        el.style.display = "";
      });
      authRequired.forEach((el) => {
        el.classList.add("authenticated");
      });
      if (loginNav) loginNav.style.display = "none";
      if (registerNav) registerNav.style.display = "none";
    } else {
      authElements.forEach((el) => {
        el.classList.remove("authenticated");
        el.style.display = "none";
      });
      authRequired.forEach((el) => {
        el.classList.remove("authenticated");
      });
      if (loginNav) loginNav.style.display = "inline-block";
      if (registerNav) registerNav.style.display = "inline-block";
    }
  }

  showError(message) {
    this.clearMessages();

    const errorDiv = document.createElement("div");
    errorDiv.className = "error";
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #fee;
      color: #c33;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #fcc;
    `;

    const activePage = document.querySelector(".page.active");
    if (activePage) {
      activePage.insertBefore(errorDiv, activePage.firstChild);
    }

    setTimeout(() => errorDiv.remove(), 5000);
  }

  showSuccess(message) {
    this.clearMessages();

    const successDiv = document.createElement("div");
    successDiv.className = "success";
    successDiv.textContent = message;
    successDiv.style.cssText = `
      background: #efe;
      color: #363;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #cfc;
    `;

    const activePage = document.querySelector(".page.active");
    if (activePage) {
      activePage.insertBefore(successDiv, activePage.firstChild);
    }

    setTimeout(() => successDiv.remove(), 5000);
  }

  clearMessages() {
    const existingError = document.querySelector(".error");
    const existingSuccess = document.querySelector(".success");
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();
  }
}
