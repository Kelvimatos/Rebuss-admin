import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/utils.js";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const navigation = [
    {
      name: "Visão Geral",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: location.pathname === "/dashboard",
      code: "01",
    },
    {
      section: "OPERAÇÕES",
    },
    {
      name: "Equipes Fixas",
      href: "/tools/equipes-fixas",
      icon: Users,
      current: location.pathname.startsWith("/tools/equipes-fixas"),
      code: "02",
    },
    {
      name: "Gerador de Escalas",
      href: "/tools/gerador-de-escalas",
      icon: Calendar,
      current: location.pathname.startsWith("/tools/gerador-de-escalas"),
      code: "03",
    },
    {
      section: "CREDENCIAIS",
    },
    {
      name: "Meu Perfil",
      href: "/profile",
      icon: User,
      current: location.pathname === "/profile",
      code: "04",
    },
    ...(isAdmin
      ? [
          {
            section: "SISTEMA",
          },
          {
            name: "Usuários e Acessos",
            href: "/users",
            icon: UserCheck,
            current: location.pathname.startsWith("/users"),
            code: "05",
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/65 lg:hidden animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-200 ease-out lg:static",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header with logo.webp */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-sidebar-border">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden text-decoration-none"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-card p-1">
              <img
                src="/logo.webp"
                alt="Rebuss Ops"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sidebar-foreground text-sm leading-none">
                  Rebuss Ops
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1">
                  CENTRAL OPERACIONAL
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            title={collapsed ? "Expandir navegação" : "Recolher navegação"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
          {navigation.map((item, idx) => {
            if ("section" in item) {
              if (collapsed) return <div key={idx} className="my-2.5 border-t border-sidebar-border" />;
              return (
                <div
                  key={idx}
                  className="px-2.5 pt-5 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground/75"
                >
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors select-none",
                  item.current
                    ? "bg-sidebar-accent text-sidebar-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r before:bg-primary"
                    : "text-muted-foreground font-medium hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    item.current ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                  )}
                />
                {!collapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}
                {!collapsed && item.code && (
                  <span
                    className={cn(
                      "font-mono text-[10px] tabular-nums transition-opacity",
                      item.current ? "text-primary font-semibold" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                    )}
                  >
                    {item.code}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Profile & Logout Section */}
        <div className="border-t border-sidebar-border p-2.5">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-md p-2 transition-colors",
              !collapsed && "bg-card/60 border border-sidebar-border"
            )}
          >
            {/* Clickable Avatar to /profile */}
            <Link
              to="/profile"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-secondary text-foreground font-mono font-semibold text-xs border border-border overflow-hidden hover:border-primary/40 transition-colors"
              title="Meu Perfil"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nome}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                user?.nome ? user.nome.charAt(0).toUpperCase() : "U"
              )}
            </Link>

            {!collapsed && (
              <Link
                to="/profile"
                className="flex flex-1 flex-col overflow-hidden text-decoration-none group"
              >
                <span className="truncate text-xs font-medium text-sidebar-foreground group-hover:text-primary transition-colors">
                  {user?.nome || "Usuário"}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    {user?.perfil === "ADMIN" && <Shield className="w-2.5 h-2.5 text-primary inline" />}
                    {user?.perfil}
                  </span>
                </div>
              </Link>
            )}

            <button
              onClick={() => logout()}
              title="Encerrar sessão"
              className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
