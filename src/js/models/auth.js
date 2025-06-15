import { API_BASE_URL } from "../config.js";

export class AuthModel {
  constructor() {
    this.token = localStorage.getItem("dicoding-token");
    this.user = null;
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    this.token = data.loginResult.token;
    this.user = data.loginResult;
    localStorage.setItem("dicoding-token", this.token);

    return data;
  }

  async register(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    return data;
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("dicoding-token");
  }

  isAuthenticated() {
    return !!this.token;
  }
}
