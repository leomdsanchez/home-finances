import { Outlet } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import { OrientationLock } from "./components/OrientationLock";

const Providers = () => {
  return (
    <SessionProvider>
      <OrientationLock />
      <Outlet />
    </SessionProvider>
  );
};

export default Providers;
