import { useEffect } from "react";

type OrientationLockType =
  | "any"
  | "natural"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

type OrientationWithLock = ScreenOrientation & {
  lock?: (orientation: OrientationLockType) => Promise<void>;
};

// Tenta reforçar a orientação retrato em tempo de execução.
export const OrientationLock = () => {
  useEffect(() => {
    let mounted = true;

    const tryLock = async () => {
      // API disponível apenas em contextos seguros e browsers compatíveis.
      const orientation = "orientation" in screen ? (screen.orientation as OrientationWithLock) : null;
      if (!orientation?.lock) return;
      try {
        await orientation.lock("portrait");
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
