import { createContext, useState, useEffect, useCallback } from "react";
import axios from "../api/axios";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({});

  const logout = useCallback(() => {
    setAuth({});
    localStorage.removeItem("authToken");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  // Initialize auth from localStorage on app start
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const validateToken = async () => {
      try {
        const response = await axios.get("/auth/validate");
        if (response.data.success) {
          setAuth({
            user: response.data.user.username,
            role: response.data.user.role,
            token,
            userId: response.data.user.id,
            email: response.data.user.email,
            is2FAEnabled: response.data.user.is_2fa_enabled,
          });
        } else {
          logout();
        }
      } catch (error) {
        console.error("Token validation failed:", error);
        logout();
      }
    };

    validateToken();
  }, [logout]);

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
