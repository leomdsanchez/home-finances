import { createBrowserRouter } from "react-router-dom";
import HomePage from "../pages/HomePage.tsx";
import SignInPage from "../pages/auth/SignInPage.tsx";
import SignUpPage from "../pages/auth/SignUpPage.tsx";
import DashboardPage from "../pages/DashboardPage.tsx";
import ProfilePage from "../pages/ProfilePage.tsx";
import OrganizationPage from "../pages/OrganizationPage.tsx";
import CategoriesPage from "../pages/CategoriesPage.tsx";
import AccountsPage from "../pages/AccountsPage.tsx";
import NotFoundPage from "../pages/404Page.tsx";
import AuthProtectedRoute from "./AuthProtectedRoute.tsx";
import Providers from "../Providers.tsx";

const router = createBrowserRouter([
  // I recommend you reflect the routes here in the pages folder
  {
    path: "/",
    element: <Providers />,
    children: [
      // Public routes
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/auth/sign-in",
        element: <SignInPage />,
      },
      {
        path: "/auth/sign-up",
        element: <SignUpPage />,
      },
      // Auth Protected routes
      {
        path: "/",
        element: <AuthProtectedRoute />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/perfil",
            element: <ProfilePage />,
          },
          {
            path: "/organizacao",
            element: <OrganizationPage />,
          },
          {
            path: "/categorias",
            element: <CategoriesPage />,
          },
          {
            path: "/contas",
            element: <AccountsPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
