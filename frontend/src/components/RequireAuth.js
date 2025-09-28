import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import React from "react";

const RequireAuth = ({ allowedRoles }) => {
  const { auth } = useAuth();
  const location = useLocation();

  const hasToken = !!localStorage.getItem("authToken");

  // If we have a token but role hasn't been populated yet, wait for AuthProvider to validate
  if (hasToken && typeof auth?.role === "undefined") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "#93c5fd",
        }}
      >
        Checking session...
      </div>
    );
  }

  return allowedRoles.includes(auth?.role) ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default RequireAuth;
