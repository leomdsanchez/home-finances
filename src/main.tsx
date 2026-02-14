import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import router from "./router";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  // Force-refresh strategy to avoid mobile/PWA devices getting stuck on older bundles.
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW?.(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Periodically check for new deployments.
      setInterval(() => {
        void registration.update();
      }, 60 * 60 * 1000);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
