export class AuthPresenter {
  constructor(authModel, authView, router) {
    this.model = authModel;
    this.view = authView;
    this.router = router;

    this.updateAuthState();

    this.bindEvents();
  }

  bindEvents() {
    this.view.bindLogin(this.handleLogin.bind(this));
    this.view.bindRegister(this.handleRegister.bind(this));
    this.view.bindLogout(this.handleLogout.bind(this));
  }

  async handleLogin(email, password) {
    try {
      const result = await this.model.login(email, password);

      console.log("Login successful:", result);

      this.view.showSuccess("Login berhasil!");

      this.updateAuthState(true);

      setTimeout(() => {
        this.router.navigateTo("home");
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      this.view.showError("Login gagal: " + error.message);
      throw error;
    }
  }

  async handleRegister(name, email, password) {
    try {
      const result = await this.model.register(name, email, password);

      console.log("Register successful:", result);

      this.view.showSuccess("Registrasi berhasil! Silakan login.");

      setTimeout(() => {
        this.router.navigateTo("login");
      }, 1500);
    } catch (error) {
      console.error("Register error:", error);
      this.view.showError("Registrasi gagal: " + error.message);
      throw error;
    }
  }

  handleLogout() {
    try {
      // Unsubscribe dari notifications sebelum logout
      if (window.app) {
        window.app.unsubscribeFromNotifications();
      }

      this.model.logout();
      this.updateAuthState(false);
      this.view.showSuccess("Logout berhasil!");

      setTimeout(() => {
        this.router.navigateTo("login");
      }, 1000);
    } catch (error) {
      console.error("Logout error:", error);
      this.view.showError("Logout gagal: " + error.message);
    }
  }

  updateAuthState(isAuthenticated = this.model.isAuthenticated()) {
    console.log("Updating auth state:", isAuthenticated);
    this.view.updateAuthState(isAuthenticated);
  }

  isAuthenticated() {
    return this.model.isAuthenticated();
  }
}
