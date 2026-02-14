import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import router from "./router";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  // More aggressive update strategy to avoid mobile/PWA devices getting stuck on older bundles.
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check for new deployments periodically and when the app regains focus/visibility.
      void registration.update();
      setInterval(() => {
        void registration.update();
      }, 5 * 60 * 1000);

      const onFocus = () => void registration.update();
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") onFocus();
      });
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
