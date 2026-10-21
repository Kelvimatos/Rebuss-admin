import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoutine } from "../../context/RoutineContext.js";
import { ROUTINE_STAGES, formatMinutesRemaining } from "../../services/routine.service.js";
import { RoutineStageId, StageExecutionStatus } from "../../types/routine.js";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
  ExternalLink,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Calendar,
  X,
  Timer,
  Sliders,
} from "lucide-react";

export const RoutineAssistant: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentTimeString,
    currentDateString,
    currentMinutes,
    classification,
    dayState,
    selectedStageId,
    setSelectedStageId,
    isExpanded,
    setIsExpanded,
    toggleChecklistItem,
    toggleStageCompleted,
    progress,
    getStageStatus,
    reminders,
    dismissReminder,
    testTimeMinutesOverride,
    setTestTimeMinutesOverride,
  } = useRoutine();

  const [showTestControls, setShowTestControls] = useState(false);

  // Etapa atualmente visualizada no painel
  const activeStageConfig = ROUTINE_STAGES.find((s) => s.id === selectedStageId)!;
  const activeStageProgress = dayState.etapas[selectedStageId] || {
    concluida: false,
    checklist: {},
  };
  const activeStageStatus = getStageStatus(selectedStageId);

  // Status visual badge helper
  const renderStatusBadge = (status: StageExecutionStatus) => {
    switch (status) {
      case "concluida":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Concluída
          </span>
        );
      case "atrasada":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            Pendente / Atrasada
          </span>
        );
      case "em_andamento":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Em andamento
          </span>
        );
      case "nao_iniciada":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
            Aguardando
          </span>
        );
    }
  };

  // Botão flutuante compacto (quando minimizado)
  if (!isExpanded) {
    const hasOverdue = classification.etapasAtrasadas.length > 0;
    const isPriority = classification.statusTipo === "prioridade";

    return (
      <div className="fixed bottom-4 right-4 z-40 select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-lg border transition-all duration-200 ${
            hasOverdue
              ? "bg-amber-950/80 border-amber-500/40 text-amber-200 hover:border-amber-400 hover:shadow-amber-900/30"
              : isPriority
              ? "bg-blue-950/90 border-blue-500/40 text-blue-100 hover:border-blue-400 hover:shadow-blue-900/30"
              : "bg-card/95 hover:bg-card border-border text-foreground hover:border-primary/50 hover:shadow-xl backdrop-blur-md"
          }`}
          title="Clique para abrir o Assistente de Rotina"
        >
          {/* Relógio / Ícone pulsante */}
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <span>{currentTimeString.substring(0, 5)}</span>
          </div>

          <div className="h-3 w-px bg-border/60" />

          {/* Texto curto da etapa */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span>{classification.statusTexto}</span>

            {/* Badge de pendência atrasada se houver */}
            {hasOverdue && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                <AlertCircle className="w-2.5 h-2.5" />
                {classification.etapasAtrasadas.length} pendência
                {classification.etapasAtrasadas.length > 1 ? "s" : ""}
              </span>
            )}

            {/* Progresso simplificado */}
            <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded border border-border/40">
              {progress.etapasConcluidasCount}/4
            </span>
          </div>

          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform" />
        </button>
      </div>
    );
  }

  // Painel flutuante expandido
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col bg-card/98 border border-border rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* 1. TOPO DO PAINEL */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold leading-tight text-foreground flex items-center gap-1.5">
              <span>Assistente de Rotina</span>
              <span className="font-mono text-[10px] text-muted-foreground font-normal">
                (SP)
              </span>
            </h3>
            <div className="font-mono text-[11px] text-primary font-bold tracking-tight">
              {currentTimeString}
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                · {currentDateString}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão para abrir menu de simulação de horários (testes) */}
          <button
            type="button"
            onClick={() => setShowTestControls((prev) => !prev)}
            className={`p-1.5 rounded text-xs transition-colors ${
              testTimeMinutesOverride !== null
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Simular horários operacionais para testes"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Minimizar */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Minimizar painel"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Menu colapsável de simulação de horários para testes */}
      {showTestControls && (
        <div className="px-4 py-2.5 border-b border-border bg-amber-500/5 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-amber-400 flex items-center gap-1 text-[11px]">
              <Timer className="w-3 h-3" />
              Simulação de Horários para Testes:
            </span>
            {testTimeMinutesOverride !== null && (
              <button
                type="button"
                onClick={() => setTestTimeMinutesOverride(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground underline flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Tempo Real
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: "10:59", min: 10 * 60 + 59 },
              { label: "11:00", min: 11 * 60 },
              { label: "13:59", min: 13 * 60 + 59 },
              { label: "14:00", min: 14 * 60 },
              { label: "16:00", min: 16 * 60 },
              { label: "17:00", min: 17 * 60 },
              { label: "20:29", min: 20 * 60 + 29 },
              { label: "20:30", min: 20 * 60 + 30 },
              { label: "21:00", min: 21 * 60 },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setTestTimeMinutesOverride(t.min)}
                className={`py-1 px-1.5 rounded text-[10px] font-mono border transition-all ${
                  testTimeMinutesOverride === t.min
                    ? "bg-amber-500 text-black font-bold border-amber-400 shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-foreground border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. LEMBRETES DISCRETOS */}
      {reminders.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-primary/5 space-y-1.5">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className={`flex items-start justify-between gap-2 p-2 rounded-lg text-xs border ${
                rem.tipo === "etapa_atrasada"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : rem.tipo === "todas_concluidas"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-200"
              }`}
            >
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                  {rem.tipo === "etapa_atrasada" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : rem.tipo === "todas_concluidas" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span>{rem.titulo}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {rem.mensagem}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissReminder(rem.id)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                title="Dispensar aviso"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. BARRA DE PROGRESSO DO DIA E TABS DAS 4 ETAPAS */}
      <div className="px-4 py-3 border-b border-border space-y-2.5">
        {/* Progresso quantitativo */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground text-[11px] font-medium">
            Progresso Geral da Rotina
          </span>
          <span className="font-mono text-[11px] font-semibold text-foreground">
            {progress.porcentagemChecklist}% ({progress.itensConcluidos}/{progress.totalItens} tarefas)
          </span>
        </div>

        {/* Linha de progresso */}
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/40">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progress.porcentagemChecklist}%` }}
          />
        </div>

        {/* 4 Etapas (Pills de navegação rápida) */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {ROUTINE_STAGES.map((stage) => {
            const status = getStageStatus(stage.id);
            const isSelected = selectedStageId === stage.id;
            const isCurrentClockStage = classification.activeTimeStageId === stage.id;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStageId(stage.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-center transition-all ${
                  isSelected
                    ? "bg-primary/15 border-primary text-primary font-semibold shadow-sm"
                    : "bg-muted/30 hover:bg-muted/60 border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1 text-[11px]">
                  <span>E{stage.numero}</span>
                  {status === "concluida" && (
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                  )}
                  {status === "atrasada" && (
                    <AlertCircle className="w-2.5 h-2.5 text-amber-500 shrink-0 animate-pulse" />
                  )}
                  {isCurrentClockStage && status !== "concluida" && status !== "atrasada" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                  )}
                </div>
                <span className="font-mono text-[9px] opacity-75">
                  {stage.horarioExibicao.split("–")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. CONTEÚDO DA ETAPA SELECIONADA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[50vh]">
        {/* Cabeçalho da Etapa */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase text-primary tracking-wider">
              ETAPA {activeStageConfig.numero} · {activeStageConfig.horarioExibicao}
            </span>
            {renderStatusBadge(activeStageStatus)}
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            {activeStageConfig.nome}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {activeStageConfig.descricao}
          </p>
        </div>

        {/* Checklist Interativo */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-foreground block">
            Checklist da Etapa:
          </span>
          <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/60">
            {activeStageConfig.checklistPadrao.map((itemTexto, idx) => {
              const isChecked = Boolean(activeStageProgress.checklist[idx]);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleChecklistItem(activeStageConfig.id, idx)}
                  className="w-full flex items-start gap-2 py-1 px-1.5 rounded text-left hover:bg-muted/40 transition-colors group"
                >
                  <div className="pt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs leading-tight transition-all ${
                      isChecked
                        ? "line-through text-muted-foreground"
                        : "text-foreground font-normal"
                    }`}
                  >
                    {itemTexto}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ação Principal e Marcar como Concluída */}
        <div className="space-y-2 pt-1">
          {/* Botão de Ação Primária da Etapa */}
          <button
            type="button"
            onClick={() => {
              navigate(activeStageConfig.acaoPrincipal.rota);
              // Em mobile, colapsa para não tampar a navegação
              if (window.innerWidth < 640) setIsExpanded(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            title={activeStageConfig.acaoPrincipal.tooltip}
          >
            <span>{activeStageConfig.acaoPrincipal.texto}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Botão de Conclusão da Etapa */}
          <button
            type="button"
            onClick={() => toggleStageCompleted(activeStageConfig.id)}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
              activeStageProgress.concluida
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                : "bg-muted/40 border-border hover:bg-muted text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {activeStageProgress.concluida
                ? "Etapa Concluída (Clique para reabrir)"
                : "Marcar Etapa como Concluída"}
            </span>
          </button>
        </div>
      </div>

      {/* 5. RODAPÉ INFORMATIVO (Próxima tarefa e contagem) */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1.5 text-[11px] truncate">
          <span className="font-medium text-foreground">Próxima:</span>
          <span className="truncate">{classification.proximaTarefa}</span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-primary shrink-0 ml-2">
          {formatMinutesRemaining(classification.tempoAteProximaMin)}
        </span>
      </div>
    </div>
  );
};

