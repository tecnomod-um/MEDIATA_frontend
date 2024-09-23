import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary/errorBoundary';
import Navbar from './components/Navbar/navbar';
import ProtectedRoute from './components/ProtectedRoute/protectedRoute';
import Main from './pages/main';
import Login from './pages/login';
import CsvChecker from './pages/csvChecker';
import About from './pages/about';
import Nodes from './pages/nodes';
import RdfParser from './pages/rdfParser';

import { AuthProvider, useAuth } from './context/authContext';
import { NodeProvider } from './context/nodeContext';
import { setupAxiosInterceptors } from './util/axiosSetup';

const App = () => {
    const { logout } = useAuth();

    useEffect(() => {
        setupAxiosInterceptors(logout);
    }, [logout]);

    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute nodeRequired={false} />}>
                    <Route path="/nodes" element={<Nodes />} />
                </Route>
                <Route element={<ProtectedRoute nodeRequired={true} />}>
                    <Route path="/csvchecker" element={<CsvChecker />} />
                </Route>
                <Route element={<ProtectedRoute nodeRequired={true} />}>
                    <Route path="/rdfparser" element={<RdfParser />} />
                </Route>
            </Routes>
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));

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
