import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function ManageBrowserHistory() {
  const location = useLocation();
  const isNavigatingBack = useRef(false);

  useEffect(() => {
    // Skip pushing to history if we're navigating back
    if (isNavigatingBack.current) {
      isNavigatingBack.current = false;
      return;
    }

    const currentUrl = location.pathname + location.search + location.hash;

    // Only push to history if this is a new location (not a back/forward navigation)
    if (window.history.state?.usr !== location.key) {
      window.history.pushState(
        {
          ...window.history.state,
          idx: (window.history.state?.idx || 0) + 1,
          usr: location.key,
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        "",
        currentUrl
      );
    }
  }, [location.pathname, location.search, location.hash, location.key]);

  useEffect(() => {
    const handlePopState = () => {
      isNavigatingBack.current = true;
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return null;
}

export default ManageBrowserHistory;