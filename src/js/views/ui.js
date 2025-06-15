export class UIView {
  constructor() {
    this.pages = document.querySelectorAll(".page");
    this.navLinks = document.querySelectorAll(".nav-link");
  }

  navigateWithTransition(callback) {
    if (document.startViewTransition) {
      document.startViewTransition(callback);
    } else {
      callback();
    }
  }

  navigateTo(route) {
    console.log("UIView navigating to:", route);

    this.navigateWithTransition(() => {
      try {
        // Hide all pages
        this.pages.forEach((page) => {
          page.classList.remove("active");
        });

        this.navLinks.forEach((link) => {
          link.classList.remove("active");
        });

        const targetPage = document.getElementById(route);
        if (targetPage) {
          targetPage.classList.add("active");
          console.log("Activated page:", route);
        } else {
          console.error("Page not found:", route);
        }

        const navLink = document.querySelector(`[data-route="${route}"]`);
        if (navLink) {
          navLink.classList.add("active");
        }
      } catch (error) {
        console.error("Error in navigateTo:", error);
      }
    });
  }

  bindNavigation(handler) {
    document.querySelectorAll("[data-route]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const route =
          e.target.getAttribute("data-route") ||
          e.currentTarget.getAttribute("data-route");
        if (route) {
          console.log("Navigation clicked:", route);
          handler(route);
        }
      });
    });

    window.addEventListener("popstate", (e) => {
      const route = window.location.hash.slice(1) || "home";
      console.log("Popstate detected:", route);
    });
  }
}
