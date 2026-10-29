import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardService } from "../services/dashboard.service.js";
import { DashboardStats } from "../types/index.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import {
  Users,
  ArrowRight,
  Calendar,
  MapPin,
  ArrowUpRight,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const statsData = await dashboardService.getStats();
        setStats(statsData);
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const totalTeams = stats?.totalEquipes ?? 0;

  return (
    <div className="space-y-8">
      {/* Editorial Masthead */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            PAINEL DE CONTROLE · REBUSS OPS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Panorama Operacional
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Consolidação do efetivo fixo por praça regional e ferramentas de despacho logístico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/tools/gerador-de-escalas">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Gerador de Escalas</span>
            </Button>
          </Link>
          <Link to="/tools/equipes-fixas">
            <Button size="sm" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Equipes Fixas</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Unified Architectural Metric Ledger */}
      <section aria-label="Indicadores Operacionais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-lg border border-border bg-card overflow-hidden">
          {/* Metric 01 */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                01 / EQUIPES CADASTRADAS
              </span>
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16 my-1" />
              ) : (
                <div className="font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {stats?.totalEquipes ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Frentes operacionais registradas no banco
              </p>
            </div>
          </div>

          {/* Metric 02 */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                02 / EFETIVO VINCULADO
              </span>
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-20 my-1" />
              ) : (
                <div className="font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {stats?.totalMembros ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Colaboradores distribuídos nas equipes
              </p>
            </div>
          </div>

          {/* Metric 03 */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                03 / EQUIPES ATIVAS
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16 my-1" />
              ) : (
                <div className="font-mono text-3xl font-semibold tracking-tight text-emerald-500 tabular-nums">
                  {stats?.totalEquipesAtivas ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Aptas para convocação e despacho imediato
              </p>
            </div>
          </div>

          {/* Metric 04 */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                04 / PRAÇAS DE ATUAÇÃO
              </span>
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-12 my-1" />
              ) : (
                <div className="font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  {stats?.regiaoStats?.length ?? 3}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                São Paulo (SP), Rio de Janeiro (RJ) e SJC
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetrical 12-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Operational Modules Directory */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-baseline justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Módulos Operacionais
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              02 FERRAMENTAS ATIVAS
            </span>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {/* Module 01: Equipes Fixas */}
            <div className="p-5 sm:p-6 transition-colors hover:bg-muted/25">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-primary">
                      01
                    </span>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      Equipes Fixas & Efetivo Regional
                    </h3>
                    <Badge variant="success">Operacional</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Base central das equipes fixas de São Paulo (SP), Rio de Janeiro (RJ) e São José dos Campos (SJC). Permite gerenciar supervisores, funções, matrículas funcionais, ordem de apresentação e exportação formatada com um clique.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Regiões</span>
                      <span className="font-mono font-medium text-foreground">SP · RJ · SJC</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Exportação</span>
                      <span className="font-medium text-foreground">Equipe ou Nomes</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Banco de Dados</span>
                      <span className="font-mono font-medium text-foreground">PostgreSQL</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <Link to="/tools/equipes-fixas">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <span>Abrir Módulo</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Module 02: Gerador de Escalas */}
            <div className="p-5 sm:p-6 transition-colors hover:bg-muted/25">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-primary">
                      02
                    </span>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      Gerador de Escalas & Transporte Próximo
                    </h3>
                    <Badge variant="secondary">Logística</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Composição padronizada de comunicados de escala a partir de endereços do Google Maps, com identificação automática da estação de transporte mais próxima.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Geocodificação</span>
                      <span className="font-medium text-foreground">Multi-estratégia BR</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Transporte</span>
                      <span className="font-medium text-foreground">Metrô, Trem e Ônibus</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Estação próxima</span>
                      <span className="font-medium text-foreground">Incluída na mensagem</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <Link to="/tools/gerador-de-escalas">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <span>Abrir Módulo</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Regional Distribution Matrix */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-baseline justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Distribuição por Região</span>
            </h2>
            <Link
              to="/tools/equipes-fixas"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : stats?.regiaoStats && stats.regiaoStats.length > 0 ? (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-2">UF</div>
                  <div className="col-span-6">Praça Operacional</div>
                  <div className="col-span-4 text-right">Equipes Ativas</div>
                </div>

                {stats.regiaoStats.map((item) => {
                  const label =
                    item.regiao === "RJ"
                      ? "Rio de Janeiro"
                      : item.regiao === "SP"
                      ? "São Paulo (Capital & RMSP)"
                      : item.regiao === "SJC"
                      ? "São José dos Campos"
                      : item.regiao;

                  const sharePercent =
                    totalTeams > 0
                      ? Math.round((item.totalEquipes / totalTeams) * 100)
                      : 0;

                  return (
                    <div
                      key={item.regiao}
                      className="p-4 space-y-2.5 transition-colors hover:bg-muted/20"
                    >
                      <div className="grid grid-cols-12 items-center">
                        <div className="col-span-2">
                          <span className="inline-flex items-center justify-center rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                            {item.regiao}
                          </span>
                        </div>
                        <div className="col-span-6">
                          <span className="text-xs font-medium text-foreground block">
                            {label}
                          </span>
                        </div>
                        <div className="col-span-4 text-right flex items-baseline justify-end gap-1.5">
                          <span className="font-mono text-base font-semibold text-foreground tabular-nums">
                            {item.totalEquipes}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                            ({sharePercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Subtle 2px architectural proportion bar */}
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(sharePercent, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhuma equipe cadastrada ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
