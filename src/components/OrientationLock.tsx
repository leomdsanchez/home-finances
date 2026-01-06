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

    const handleGesture = () => {
      if (!mounted) return;
      void tryLock();
    };

    const handleVisibility = () => {
      if (!mounted || document.visibilityState !== "visible") return;
      void tryLock();
    };

    screen.orientation?.addEventListener?.("change", handleChange);
    window.addEventListener("orientationchange", handleChange);
    window.addEventListener("pointerdown", handleGesture);
    window.addEventListener("touchstart", handleGesture);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      screen.orientation?.removeEventListener?.("change", handleChange);
      window.removeEventListener("orientationchange", handleChange);
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
};
