import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from "react-router-dom";
import './index.css';
import Navbar from "./components/Navbar/navbar";
import ErrorBoundary from "./components/ErrorBoundary/errorBoundary";
import Main from "./pages/main";
import DataPeek from "./pages/dataPeek";
import About from "./pages/about";

// Route definition
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <div id="overlay"></div>
        <HashRouter>
            <Navbar />
            <Routes>
                <Route
                    path="/"
                    element={<Main />}
                ></Route>
                <Route
                    path="/datapeek"
                    element={<DataPeek />}
                ></Route>
                <Route
                    path="/about"
                    element={<About />}
                ></Route>
            </Routes>
        </HashRouter>
    </ErrorBoundary>
)
