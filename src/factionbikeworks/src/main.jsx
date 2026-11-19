import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/theme.css";
import "./styles/components.css";
import "./styles/pages.css";
import axios from "axios";
import App from "./App";

// Admin screens call axios directly; always send the session cookie (matters for split-origin deploys).
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
