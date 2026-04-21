import { useState } from "react";
import { SellerLoginPage } from "./components/SellerLoginPage";
import { SellerSignUpPage } from "./components/SellerSignUpPage";
import { SellerPortal } from "./components/SellerPortal";
import { AdminLoginPage } from "./components/AdminLoginPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { CreateUserPage } from "./components/CreateUserPage";
import { EditUserPage } from "./components/EditUserPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState<"login" | "signup" | "portal" | "admin-login" | "admin-dashboard" | "admin-create-user" | "admin-edit-user">("login");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const handleEditUser = (userId: number) => {
    setSelectedUserId(userId);
    setCurrentPage("admin-edit-user");
  };

  return (
    <>
      {currentPage === "login" ? (
        <SellerLoginPage 
          onSwitchToSignUp={() => setCurrentPage("signup")}
          onLogin={() => setCurrentPage("portal")}
          onSwitchToAdmin={() => setCurrentPage("admin-login")}
        />
      ) : currentPage === "signup" ? (
        <SellerSignUpPage onSwitchToLogin={() => setCurrentPage("login")} />
      ) : currentPage === "portal" ? (
        <SellerPortal onLogout={() => setCurrentPage("login")} />
      ) : currentPage === "admin-login" ? (
        <AdminLoginPage 
          onLogin={() => setCurrentPage("admin-dashboard")}
          onBackToSeller={() => setCurrentPage("login")}
        />
      ) : currentPage === "admin-dashboard" ? (
        <AdminDashboard 
          onLogout={() => setCurrentPage("admin-login")}
          onCreateUser={() => setCurrentPage("admin-create-user")}
          onEditUser={handleEditUser}
        />
      ) : currentPage === "admin-create-user" ? (
        <CreateUserPage 
          onBack={() => setCurrentPage("admin-dashboard")}
          onUserCreated={() => setCurrentPage("admin-dashboard")}
        />
      ) : (
        <EditUserPage 
          onBack={() => setCurrentPage("admin-dashboard")}
          onUserUpdated={() => setCurrentPage("admin-dashboard")}
          userId={selectedUserId || 1}
        />
      )}
    </>
  );
}