import { useCallback, useEffect, useState } from "react";
import { buildPath, parseRoute, type Route } from "../lib/router";

export interface NavigateOptions {
  /** Substitui a entrada atual do histórico em vez de criar uma nova. */
  replace?: boolean;
}

function readLocation(): Route {
  return parseRoute(window.location.pathname, window.location.search);
}

export function useRoute(): { route: Route; navigate: (route: Route, opts?: NavigateOptions) => void } {
  const [route, setRoute] = useState<Route>(readLocation);

  useEffect(() => {
    const handlePopState = () => setRoute(readLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((next: Route, opts: NavigateOptions = {}) => {
    const path = buildPath(next);
    if (opts.replace) {
      window.history.replaceState(null, "", path);
    } else {
      window.history.pushState(null, "", path);
    }
    setRoute(readLocation());
  }, []);

  return { route, navigate };
}
