import React from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./app.css";
import { App } from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Live Architecture Map root element was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
