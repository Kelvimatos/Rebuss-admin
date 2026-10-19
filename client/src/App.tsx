import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.js";
import { ToastProvider } from "./context/ToastContext.js";
import { AuthProvider } from "./context/AuthContext.js";
import { AppRoutes } from "./routes/AppRoutes.js";

export function App() {
  useEffect(() => {
    document.title = "Rebuss Ops";
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
