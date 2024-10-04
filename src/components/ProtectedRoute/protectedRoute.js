import React from "react";
import { useAuth } from "../../context/authContext";
import { useNode } from "../../context/nodeContext";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ nodeRequired }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedNode } = useNode();

  if (isLoading) return <div></div>;

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (nodeRequired && !selectedNode) return <Navigate to="/nodes" />;

  return <Outlet />;
};

export default ProtectedRoute;
