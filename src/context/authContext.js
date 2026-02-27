import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useNode } from "./nodeContext";
import { setupNodeAxiosInterceptors } from "../util/nodeAxiosSetup";
import { getSystemCapabilities } from "../util/petitionHandler";

const AuthContext = createContext();

const DEFAULT_CAPS = { semanticAlignment: false, hl7fhir: false };
const CAPS_STORAGE_KEY = "systemCapabilities";

function safeParseCaps(raw) {
  try {
    const parsed = JSON.parse(raw);
    return {
      semanticAlignment: !!parsed?.semanticAlignment,
      hl7fhir: !!parsed?.hl7fhir,
    };
  } catch {
    return null;
  }
}

// Authentication context provider for managing user login state and JWT tokens
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { clearSelectedNodes } = useNode();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState(() => {
    const cached = localStorage.getItem(CAPS_STORAGE_KEY);
    return cached ? (safeParseCaps(cached) ?? DEFAULT_CAPS) : DEFAULT_CAPS;
  });
  const [capsLoaded, setCapsLoaded] = useState(() => {
    return !!safeParseCaps(localStorage.getItem(CAPS_STORAGE_KEY) || "");
  });

  const capsFetchStartedRef = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("kerberosTGT");
    localStorage.removeItem("jwtNodeTokens");
    localStorage.removeItem("selectedNodes");
    localStorage.removeItem(CAPS_STORAGE_KEY);

    setCapabilities(DEFAULT_CAPS);
    setCapsLoaded(false);
    capsFetchStartedRef.current = false;

    setIsAuthenticated(false);
    clearSelectedNodes();
    navigate("/login");
  }, [navigate, clearSelectedNodes]);

  const refreshCapabilitiesOnce = useCallback(async () => {
    if (capsLoaded) return capabilities;
    if (capsFetchStartedRef.current) return capabilities;

    capsFetchStartedRef.current = true;

    try {
      const caps = await getSystemCapabilities();
      const normalized = {
        semanticAlignment: !!caps?.semanticAlignment,
        hl7fhir: !!caps?.hl7fhir,
      };
      setCapabilities(normalized);
      setCapsLoaded(true);
      localStorage.setItem(CAPS_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      setCapabilities(DEFAULT_CAPS);
      setCapsLoaded(true);
      localStorage.setItem(CAPS_STORAGE_KEY, JSON.stringify(DEFAULT_CAPS));
      return DEFAULT_CAPS;
    }
  }, [capsLoaded, capabilities]);

  useEffect(() => {
    setupNodeAxiosInterceptors(logout);

    const token = localStorage.getItem("jwtToken");
    const tgt = localStorage.getItem("kerberosTGT");

    if (token && tgt) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          if (!capsLoaded)   refreshCapabilitiesOnce();
        } else 
          logout();
      } catch {
        logout();
      }
    }

    setIsLoading(false);
  }, [logout, capsLoaded, refreshCapabilitiesOnce]);

  const loginAndLoadCaps = useCallback(async (token, tgt) => {
    localStorage.removeItem("jwtNodeTokens");
    localStorage.setItem("jwtToken", token);
    localStorage.setItem("kerberosTGT", tgt);
    localStorage.removeItem(CAPS_STORAGE_KEY);
    setCapsLoaded(false);
    setCapabilities(DEFAULT_CAPS);
    capsFetchStartedRef.current = false;

    await refreshCapabilitiesOnce();
    setIsAuthenticated(true);
  }, [refreshCapabilitiesOnce]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        logout,
        capabilities,
        capsLoaded,
        loginAndLoadCaps,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
