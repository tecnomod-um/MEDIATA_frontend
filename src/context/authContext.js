import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useNode } from "./nodeContext";
import { setupNodeAxiosInterceptors } from "../util/nodeAxiosSetup";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { clearSelectedNodes } = useNode();

  const logout = useCallback(() => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("kerberosTGT");
    localStorage.removeItem("jwtNodeTokens");
    setIsAuthenticated(false);
    clearSelectedNodes();
    navigate("/login");
  }, [navigate, clearSelectedNodes]);

  useEffect(() => {
    setupNodeAxiosInterceptors(logout);

    const token = localStorage.getItem("jwtToken");
    const tgt = localStorage.getItem("kerberosTGT");

    if (token && tgt) {
      try {
        const decodedToken = jwtDecode(token);
        if (decodedToken.exp * 1000 > Date.now())
          setIsAuthenticated(true);
        else {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("kerberosTGT");
          localStorage.removeItem("jwtNodeTokens");
        }
      } catch (error) {
        console.error("Failed to decode token:", error);
      }
    } setIsLoading(false);
  }, [logout]);

  const login = (token, tgt) => {
    localStorage.removeItem("jwtNodeTokens");
    localStorage.setItem("jwtToken", token);
    localStorage.setItem("kerberosTGT", tgt);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
