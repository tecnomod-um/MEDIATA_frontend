import React, { useEffect, lazy, Suspense } from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/Navigation/ErrorBoundary/errorBoundary";
import Navbar from "./components/Navigation/Navbar/navbar";
import ProtectedRoute from "./components/Navigation/ProtectedRoute/protectedRoute";
import { AuthProvider, useAuth } from "./context/authContext";
import { NodeProvider } from "./context/nodeContext";
import { setupAxiosInterceptors } from "./util/axiosSetup";
import Discovery from "./pages/harmonization/discovery";
import Integration from "./pages/harmonization/integration";
import SemanticAlignment from "./pages/harmonization/semanticAlignment";
import HL7FHIR from "./pages/harmonization/hl7FHIR";

const Main = lazy(() => import(/* webpackChunkName: "page-main" */ "./pages/main/main"));
const Login = lazy(() => import(/* webpackChunkName: "page-login" */ "./pages/login/login"));
const About = lazy(() => import(/* webpackChunkName: "page-about" */ "./pages/about/about"));
const Tutorial = lazy(() => import(/* webpackChunkName: "page-tutorial" */ "./pages/tutorial/tutorial"));
const Nodes = lazy(() => import(/* webpackChunkName: "page-nodes" */ "./pages/nodes/nodes"));
const Projects = lazy(() => import(/* webpackChunkName: "page-projects" */ "./pages/projects/projects"));

// Application entry point and routing configuration
const App = () => {
  const { logout } = useAuth();
  useEffect(() => setupAxiosInterceptors(logout), [logout]);

  return (
    <>
      <div id="overlay"></div>
      <Navbar />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route element={<ProtectedRoute nodeRequired={false} />}>
            <Route path="/projects" element={<Projects />} />
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
      </Suspense>
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
