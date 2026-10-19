import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";
import { authService } from "../services/auth.service.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card.js";
import { ShieldCheck, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password reset flow states
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Login realizado com sucesso! Bem-vindo ao Rebuss Ops.");
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMessage(
        err.message || "Credenciais inválidas. Verifique seu e-mail e senha."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!resetEmail.trim()) {
      setErrorMessage("Informe o e-mail da conta para redefinição.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await authService.requestPasswordReset(resetEmail.trim());
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setResetStep("confirm");
      toast.success("Solicitação validada. Defina sua nova senha segura.");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao iniciar redefinição de senha.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!resetToken.trim()) {
      setErrorMessage("Token de redefinição obrigatório.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("A nova senha deve possuir no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage("A confirmação de senha não coincide.");
      return;
    }

    setResetLoading(true);
    try {
      await authService.confirmPasswordReset(resetToken.trim(), newPassword);
      toast.success("Senha redefinida com sucesso! Faça login com sua nova credencial.");
      setEmail(resetEmail.trim());
      setPassword("");
      setResetMode(false);
      setResetStep("request");
      setResetToken("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setErrorMessage(err.message || "Não foi possível redefinir a senha.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Left Architectural Editorial Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between border-r border-border bg-sidebar-background p-10 xl:p-14 bg-architectural-grid">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-border bg-card p-1.5">
              <img
                src="/logo.webp"
                alt="Rebuss Ops"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-foreground block leading-none">
                Rebuss Ops
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 block">
                PLATAFORMA OPERACIONAL
              </span>
            </div>
          </div>

          <span className="font-mono text-[11px] text-muted-foreground border border-border bg-card/80 px-2.5 py-1 rounded">
            SP · RJ · SJC
          </span>
        </div>

        <div className="max-w-md space-y-6 my-auto py-12">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Coordenação & Logística de Campo</span>
          </div>

          <h1 className="text-2xl xl:text-3xl font-semibold tracking-tight text-foreground leading-[1.2]">
            Gestão de equipes fixas, supervisão regional e despacho de escalas em uma única central.
          </h1>

          <p className="text-xs xl:text-sm text-muted-foreground leading-relaxed">
            Estrutura desenhada para operações reais: consulta rápida de matrículas, organização de efetivo por supervisor e cálculo de deslocamento até estações e terminais.
          </p>

          <div className="border-t border-border pt-6 space-y-3.5 text-xs">
            <div className="grid grid-cols-12 items-baseline gap-2">
              <span className="col-span-2 font-mono text-[11px] text-muted-foreground">01</span>
              <span className="col-span-4 font-semibold text-foreground">Equipes Fixas</span>
              <span className="col-span-6 text-muted-foreground">Controle de efetivo SP, RJ e SJC</span>
            </div>
            <div className="grid grid-cols-12 items-baseline gap-2 border-t border-border/60 pt-3.5">
              <span className="col-span-2 font-mono text-[11px] text-muted-foreground">02</span>
              <span className="col-span-4 font-semibold text-foreground">Escalas & Rotas</span>
              <span className="col-span-6 text-muted-foreground">Geocodificação e transporte próximo</span>
            </div>
            <div className="grid grid-cols-12 items-baseline gap-2 border-t border-border/60 pt-3.5">
              <span className="col-span-2 font-mono text-[11px] text-muted-foreground">03</span>
              <span className="col-span-4 font-semibold text-foreground">Persistência</span>
              <span className="col-span-6 text-muted-foreground">Banco relacional PostgreSQL dedicado</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Acesso restrito a operadores e administradores</span>
          </div>
          <span className="font-mono text-[10px]">REBUSS OPS</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-3 pb-2 border-b border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-card p-1.5">
              <img
                src="/logo.webp"
                alt="Rebuss Ops"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground leading-none">
                Rebuss Ops
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                Plataforma Operacional
              </p>
            </div>
          </div>

          <Card className="border-border bg-card">
            {!resetMode ? (
              <>
                <CardHeader className="space-y-1 pb-4 border-b border-border/70">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    AUTENTICAÇÃO
                  </div>
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    Acessar plataforma
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informe suas credenciais corporativas para iniciar a sessão.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4 pt-5">
                    {errorMessage && (
                      <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <Input
                      label="E-mail de Acesso"
                      type="email"
                      placeholder="seu.email@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      autoFocus
                    />

                    <Input
                      label="Senha"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />

                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setResetEmail(email.trim());
                          setResetMode(true);
                          setResetStep("request");
                        }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium flex items-center gap-1.5"
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>Redefinir ou configurar senha</span>
                      </button>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col space-y-3 pt-2">
                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      isLoading={loading}
                    >
                      Entrar no Sistema
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : (
              <>
                <CardHeader className="space-y-1 pb-4 border-b border-border/70">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    SEGURANÇA DA CONTA
                  </div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Redefinição de Senha
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {resetStep === "request"
                      ? "Informe o e-mail da conta para validar e gerar um token de uso único."
                      : "Defina sua nova credencial de acesso (mínimo de 8 caracteres)."}
                  </CardDescription>
                </CardHeader>

                {resetStep === "request" ? (
                  <form onSubmit={handleRequestReset}>
                    <CardContent className="space-y-4 pt-5">
                      {errorMessage && (
                        <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <Input
                        label="E-mail da Conta"
                        type="email"
                        placeholder="seu.email@empresa.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={resetLoading}
                        required
                        autoFocus
                      />
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-3 pt-2">
                      <Button
                        type="submit"
                        className="w-full font-semibold"
                        isLoading={resetLoading}
                      >
                        Continuar
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetMode(false);
                          setErrorMessage(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        <span>Voltar para o login</span>
                      </button>
                    </CardFooter>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset}>
                    <CardContent className="space-y-4 pt-5">
                      {errorMessage && (
                        <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <Input
                        label="Token de Segurança (Uso Único)"
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        disabled={resetLoading}
                        required
                      />

                      <Input
                        label="Nova Senha (mín. 8 caracteres)"
                        type="password"
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={resetLoading}
                        required
                        autoFocus
                      />

                      <Input
                        label="Confirmar Nova Senha"
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={resetLoading}
                        required
                      />
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-3 pt-2">
                      <Button
                        type="submit"
                        className="w-full font-semibold"
                        isLoading={resetLoading}
                      >
                        Salvar Nova Senha
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetMode(false);
                          setResetStep("request");
                          setErrorMessage(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        <span>Cancelar e voltar</span>
                      </button>
                    </CardFooter>
                  </form>
                )}
              </>
            )}
          </Card>

          {/* Subtle Security Notice */}
          <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3.5 py-2.5 text-xs text-muted-foreground">
            <span>Ambiente Corporativo Seguro</span>
            <span className="font-mono text-[11px] font-medium text-foreground">
              Autenticação Auditada
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
