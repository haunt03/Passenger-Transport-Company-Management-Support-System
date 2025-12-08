
// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// Suppress Chrome extension errors (runtime.lastError)
// These errors are harmless and come from browser extensions, not our code
if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args) => {
        const message = args.join(" ");
        // Ignore Chrome extension runtime errors
        if (
            message.includes("runtime.lastError") ||
            message.includes("Receiving end does not exist") ||
            message.includes("Could not establish connection")
        ) {
            return; // Suppress these errors
        }
        originalError.apply(console, args);
    };

    // Also suppress unhandled promise rejections from extensions
    window.addEventListener("unhandledrejection", (event) => {
        const message = String(event.reason || event);
        if (
            message.includes("runtime.lastError") ||
            message.includes("Receiving end does not exist") ||
            message.includes("Could not establish connection")
        ) {
            event.preventDefault(); // Suppress these errors
        }
    });
}

import AppLayout from "./AppLayout.jsx";

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <AppLayout />
        </BrowserRouter>
    </React.StrictMode>
);