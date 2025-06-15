export class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentRoute = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    window.addEventListener("popstate", (e) => {
      this.handleRouteChange(false);
    });

    window.addEventListener("hashchange", () => {
      this.handleRouteChange(false);
    });

    this.isInitialized = true;

    this.handleRouteChange(true);
  }

  handleRouteChange(pushState = true) {
    const hash = window.location.hash.slice(1) || "home";
    const route = this.routes[hash] || this.routes["404"];

    if (!route) {
      console.error(`Route not found: ${hash}`);
      return;
    }

    if (this.currentRoute && this.currentRoute !== route) {
      try {
        this.currentRoute.leave();
      } catch (error) {
        console.error("Error in route leave handler:", error);
      }
    }

    this.currentRoute = route;

    try {
      route.enter();
    } catch (error) {
      console.error("Error in route enter handler:", error);
    }

    if (pushState && window.location.hash !== `#${hash}`) {
      history.pushState(null, null, `#${hash}`);
    }
  }

  navigateTo(route) {
    if (window.location.hash.slice(1) === route) {
      const routeHandler = this.routes[route] || this.routes["404"];
      if (routeHandler) {
        routeHandler.enter();
      }
      return;
    }

    window.location.hash = route;
  }
}
