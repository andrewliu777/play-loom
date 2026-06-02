import React from "react";
import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import { Layout } from "./components/Layout";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Layout />
  </React.StrictMode>,
);
