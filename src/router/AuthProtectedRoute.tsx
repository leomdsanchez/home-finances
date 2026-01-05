import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../context/SessionContext";

const AuthProtectedRoute = () => {
  const { session } = useSession();
  if (!session) {
    return <Navigate to="/auth/sign-in" replace />;
  }
  return <Outlet />;
};

export default AuthProtectedRoute;
