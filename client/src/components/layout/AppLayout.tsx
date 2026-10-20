import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import { RoutineProvider } from "../../context/RoutineContext.js";
import { RoutineAssistant } from "../routine/RoutineAssistant.js";

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("rebuss_sidebar_collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("rebuss_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <RoutineProvider>
      <div className="flex min-h-screen bg-background relative">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onOpenMobile={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Assistente de Rotina Operacional Flutuante */}
        <RoutineAssistant />
      </div>
    </RoutineProvider>
  );
};

