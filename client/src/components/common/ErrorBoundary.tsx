import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Rebuss Ops ErrorBoundary] Uncaught render error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[280px] w-full flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-rose-500/30 bg-[#0f172a]/95 p-6 shadow-2xl backdrop-blur-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {this.props.fallbackTitle || "Ops! Ocorreu uma instabilidade neste módulo"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Um erro inesperado foi interceptado com segurança para evitar travamento da tela. Seus outros dados continuam preservados.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="rounded-md border border-rose-500/20 bg-rose-950/20 p-2.5 text-left text-xs font-mono text-rose-300 max-h-32 overflow-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/80 px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Tentar Novamente</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span>Recarregar Sistema</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
