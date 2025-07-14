import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ErrorBoundary from "./components/Navigation/ErrorBoundary/errorBoundary";
import Navbar from "./components/Navigation/Navbar/navbar";
import ProtectedRoute from "./components/Navigation/ProtectedRoute/protectedRoute";
import Main from "./pages/main";
import Login from "./pages/login";
import About from "./pages/about";
import Nodes from "./pages/nodes";
import Discovery from "./pages/harmonization/discovery";
import Integration from "./pages/harmonization/integration";
import SemanticAlignment from "./pages/harmonization/semanticAlignment";
import HL7FHIR from "./pages/harmonization/hl7FHIR";
import { AuthProvider, useAuth } from "./context/authContext";
import { NodeProvider } from "./context/nodeContext";
import { setupAxiosInterceptors } from "./util/axiosSetup";

const App = () => {
  const { logout } = useAuth();

  useEffect(() => {
    setupAxiosInterceptors(logout);
  }, [logout]);

  return (
    <>
      <div id="overlay"></div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute nodeRequired={false} />}>
          <Route path="/nodes" element={<Nodes />} />
        </Route>
        <Route element={<ProtectedRoute nodeRequired={true} />}>
          <Route path="/discovery" element={<Discovery />} />
        </Route>
        <Route element={<ProtectedRoute nodeRequired={true} />}>
          <Route path="/integration" element={<Integration />} />
        </Route>
        <Route element={<ProtectedRoute nodeRequired={true} />}>
          <Route path="/semanticalignment" element={<SemanticAlignment />} />
        </Route>
        <Route element={<ProtectedRoute nodeRequired={true} />}>
          <Route path="/hl7fhir" element={<HL7FHIR />} />
        </Route>
      </Routes>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <ErrorBoundary>
    <HashRouter>
      <NodeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NodeProvider>
    </HashRouter>
  </ErrorBoundary>
);
