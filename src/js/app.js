import { API_BASE_URL, DEFAULT_MAP_VIEW, DEFAULT_MAP_ZOOM } from "./config.js";
import { Router } from "./router.js";
import { AuthModel } from "./models/auth.js";
import { StoryModel } from "./models/story.js";
import { AuthView } from "./views/auth.js";
import { StoryView } from "./views/story.js";
import { UIView } from "./views/ui.js";
import { AuthPresenter } from "./presenters/auth.js";
import { StoryPresenter } from "./presenters/story.js";

class App {
  constructor() {
    window.app = this;
    this.init();
  }

  async init() {
    try {
      this.initModels();
      this.initViews();
      this.initPresenters();
      this.initRouter();
      this.initPushNotification();
      this.initIndexedDB();

      console.log("App initialized successfully");
    } catch (error) {
      console.error("App initialization failed:", error);
    }
  }

  initModels() {
    this.authModel = new AuthModel();
    this.storyModel = new StoryModel(this.authModel);
  }

  initViews() {
    this.authView = new AuthView();
    this.storyView = new StoryView();
    this.uiView = new UIView();
  }

  initPresenters() {
    const tempRouter = {
      navigateTo: (route) => {
        console.log("Temp router navigating to:", route);
        if (this.router) {
          this.router.navigateTo(route);
        } else {
          this.pendingRoute = route;
        }
      },
    };

    this.authPresenter = new AuthPresenter(
      this.authModel,
      this.authView,
      tempRouter
    );
    this.storyPresenter = new StoryPresenter(
      this.storyModel,
      this.storyView,
      tempRouter
    );
  }

  initRouter() {
    this.router = new Router({
      login: {
        enter: () => {
          console.log("Entering login route");
          this.storyView.cleanupCamera();
          this.uiView.navigateTo("login");
        },
        leave: () => {
          console.log("Leaving login route");
        },
      },
      register: {
        enter: () => {
          console.log("Entering register route");
          this.storyView.cleanupCamera();
          this.uiView.navigateTo("register");
        },
        leave: () => {
          console.log("Leaving register route");
        },
      },
      home: {
        enter: () => {
          console.log("Entering home route");
          if (this.authPresenter.isAuthenticated()) {
            this.storyView.cleanupCamera();
            this.uiView.navigateTo("home");

            setTimeout(() => {
              this.storyPresenter.loadStories();
            }, 100);
          } else {
            console.log("Not authenticated, redirecting to login");
            this.router.navigateTo("login");
          }
        },
        leave: () => {
          console.log("Leaving home route");
        },
      },
      "add-story": {
        enter: () => {
          console.log("Entering add-story route");
          if (this.authPresenter.isAuthenticated()) {
            this.uiView.navigateTo("add-story");
            setTimeout(() => {
              this.storyView.initializeStoryMap();
            }, 100);
          } else {
            console.log("Not authenticated, redirecting to login");
            this.router.navigateTo("login");
          }
        },
        leave: () => {
          console.log("Leaving add-story route");
          this.storyView.cleanupCamera();
        },
      },
      404: {
        enter: () => {
          console.log("Entering 404 route");
          this.storyView.cleanupCamera();
          const defaultRoute = this.authPresenter.isAuthenticated()
            ? "home"
            : "login";
          this.router.navigateTo(defaultRoute);
        },
        leave: () => {
          console.log("Leaving 404 route");
        },
      },
    });

    this.authPresenter.router = this.router;
    this.storyPresenter.router = this.router;

    this.uiView.bindNavigation((route) => {
      this.router.navigateTo(route);
    });

    this.router.init();

    if (this.pendingRoute) {
      this.router.navigateTo(this.pendingRoute);
      this.pendingRoute = null;
    }
  }

  initIndexedDB() {
    this.db = null;
    const request = indexedDB.open("storyAppDatabase", 1);

    request.onerror = (event) => {
      console.log("Database error:", event.target.errorCode);
    };

    request.onsuccess = (event) => {
      this.db = event.target.result;
      console.log("Database opened successfully");
      this.loadOfflineStories();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("stories")) {
        const objectStore = db.createObjectStore("stories", {
          keyPath: "id",
          autoIncrement: true,
        });
        objectStore.createIndex("name", "name", { unique: false });
        objectStore.createIndex("description", "description", {
          unique: false,
        });
      }
    };
  }

  async saveStory(story) {
    if (!this.db) return;

    const transaction = this.db.transaction(["stories"], "readwrite");
    const store = transaction.objectStore("stories");
    const { id, ...storyData } = story;

    const request = store.add({
      ...storyData,
      timestamp: Date.now(),
    });

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        console.log("Story saved to IndexedDB with ID:", event.target.result);
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        console.log("Error saving story:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getAllStories() {
    if (!this.db) return [];

    const transaction = this.db.transaction(["stories"], "readonly");
    const store = transaction.objectStore("stories");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async deleteStory(storyId) {
    if (!this.db) return;

    const transaction = this.db.transaction(["stories"], "readwrite");
    const store = transaction.objectStore("stories");
    const id = typeof storyId === "string" ? parseInt(storyId) : storyId;

    const request = store.delete(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log("Story deleted from IndexedDB");
        resolve();
      };
      request.onerror = (event) => {
        console.error("Delete error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async loadOfflineStories() {
    try {
      const stories = await this.getAllStories();
      if (stories.length > 0) {
        this.storyView.displayOfflineStories(stories);
      }
    } catch (error) {
      console.error("Error loading offline stories:", error);
    }
  }

  async saveApiStoriesToIndexedDB(stories) {
    for (const story of stories) {
      try {
        await this.saveStory(story);
      } catch (error) {
        console.error("Error saving story to IndexedDB:", error);
      }
    }
  }

  async initPushNotification() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker berhasil didaftarkan:", registration.scope);

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const swRegistration = await navigator.serviceWorker.ready;
          const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk",
          });

          console.log("Push subscription berhasil:", subscription);
          await this.sendSubscriptionToServer(subscription);
          this.scheduleTestNotification();
        }
      } catch (error) {
        console.error("Error dalam push notification setup:", error);
      }
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authModel.token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        }),
      });

      if (response.ok) {
        console.log("Subscription berhasil dikirim ke server");
      }
    } catch (error) {
      console.log("Gagal mengirim subscription ke server:", error);
    }
  }

  async unsubscribeFromNotifications() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const swRegistration = await navigator.serviceWorker.ready;
        const subscription = await swRegistration.pushManager.getSubscription();

        if (subscription) {
          // Unsubscribe dari server
          await fetch(`${API_BASE_URL}/notifications/subscribe`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.authModel.token}`,
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          });

          // Unsubscribe dari browser
          await subscription.unsubscribe();
          console.log("Successfully unsubscribed from notifications");
        }
      } catch (error) {
        console.error("Error unsubscribing from notifications:", error);
      }
    }
  }

  scheduleTestNotification() {
    setTimeout(() => {
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("Dicoding Stories", {
            body: "Selamat datang! Push notification berhasil diaktifkan.",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            vibrate: [100, 50, 100],
            data: {
              url: "/#home",
            },
          });
        });
      }
    }, 10000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing app...");
  try {
    new App();
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
});
