import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.js";
import { useAuth } from "../../context/AuthContext.js";
import { Menu, Sun, Moon, ChevronRight, Shield } from "lucide-react";
import { Button } from "../ui/Button.js";

interface HeaderProps {
  onOpenMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobile }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/dashboard") {
      return [{ label: "Rebuss Ops", href: "/dashboard" }, { label: "Visão Geral" }];
    }
    if (path.startsWith("/tools/equipes-fixas")) {
      return [
        { label: "Operações", href: "/dashboard" },
        { label: "Equipes Fixas", href: "/tools/equipes-fixas" },
      ];
    }
    if (path.startsWith("/tools/gerador-de-escalas")) {
      return [
        { label: "Operações", href: "/dashboard" },
        { label: "Gerador de Escalas" },
      ];
    }
    if (path === "/profile") {
      return [
        { label: "Credenciais", href: "/dashboard" },
        { label: "Meu Perfil" },
      ];
    }
    if (path.startsWith("/users")) {
      return [
        { label: "Sistema", href: "/dashboard" },
        { label: "Usuários e Acessos" },
      ];
    }
    return [{ label: "Rebuss Ops", href: "/dashboard" }];
  };

  const breadcrumbs = getBreadcrumbs();

  const todayFormatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(new Date())
    .replace(/\./g, "")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 lg:px-8">
      {/* Left side: Mobile Toggle, Brand Logo (mobile) & Breadcrumbs */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded border border-transparent hover:border-border hover:bg-muted"
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link
          to="/dashboard"
          className="flex lg:hidden items-center gap-2 shrink-0 pr-2 border-r border-border"
          title="Rebuss Ops"
        >
          <img
            src="/logo.webp"
            alt="Rebuss Ops"
            className="h-5 w-5 object-contain"
          />
        </Link>

        <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="hover:text-foreground transition-colors font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-semibold text-foreground tracking-tight" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right side: Operational Date, Theme toggle and User link */}
      <div className="flex items-center gap-2.5">
        <div className="hidden md:flex items-center gap-2 pr-2.5 border-r border-border">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[11px] font-medium text-muted-foreground tracking-wider tabular-nums">
            {todayFormatted}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-foreground/80" />
          )}
        </Button>

        {/* User info linking to /profile */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 pl-2.5 border-l border-border hover:opacity-85 transition-opacity"
          title="Ver Meu Perfil"
        >
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-medium leading-tight text-foreground">
              {user?.nome || "Usuário"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground leading-tight flex items-center justify-end gap-1 mt-0.5">
              {user?.perfil === "ADMIN" && <Shield className="w-2.5 h-2.5 text-primary" />}
              {user?.perfil}
            </span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-foreground font-mono font-semibold text-xs border border-border overflow-hidden">
            {user?.avatarUrl && user.avatarUrl !== "/api/auth/profile/avatar" ? (
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
          </div>
        </Link>
      </div>
    </header>
  );
};
