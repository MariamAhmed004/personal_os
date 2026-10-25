import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";
import { router } from "./app/router";
import { ThemeProvider } from "./app/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider><RouterProvider router={router} /></ThemeProvider>
  </React.StrictMode>,
);
