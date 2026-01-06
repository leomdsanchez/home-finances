import { useEffect } from "react";

// Tenta reforçar a orientação retrato em tempo de execução.
export const OrientationLock = () => {
  useEffect(() => {
    let mounted = true;

    const tryLock = async () => {
      // API disponível apenas em contextos seguros e browsers compatíveis.
      if (!("orientation" in screen) || typeof screen.orientation.lock !== "function") return;
      try {
        await screen.orientation.lock("portrait");
      } catch (err) {
        console.warn("Falhou ao travar orientação:", err);
      }
    };

    void tryLock();

    const handleChange = () => {
      if (!mounted) return;
      void tryLock();
    };

    screen.orientation?.addEventListener?.("change", handleChange);
    window.addEventListener("orientationchange", handleChange);

    return () => {
      mounted = false;
      screen.orientation?.removeEventListener?.("change", handleChange);
      window.removeEventListener("orientationchange", handleChange);
    };
  }, []);

  return null;
};
