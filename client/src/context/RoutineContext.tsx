import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext.js";
import {
  RoutineStageConfig,
  RoutineStageId,
  RoutineDayState,
  RoutineCurrentClassification,
  StageExecutionStatus,
  RoutineReminder,
} from "../types/routine.js";
import {
  ROUTINE_STAGES,
  getSaoPauloTime,
  classifyRoutine,
  calculateRoutineProgress,
  getStageExecutionStatus,
  loadDayState,
  saveDayState,
} from "../services/routine.service.js";

interface RoutineContextType {
  currentTimeString: string;
  currentDateString: string;
  currentMinutes: number;
  stages: RoutineStageConfig[];
  dayState: RoutineDayState;
  classification: RoutineCurrentClassification;
  selectedStageId: RoutineStageId;
  setSelectedStageId: (id: RoutineStageId) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  toggleChecklistItem: (stageId: RoutineStageId, itemIndex: number) => void;
  toggleStageCompleted: (stageId: RoutineStageId) => void;
  progress: ReturnType<typeof calculateRoutineProgress>;
  getStageStatus: (stageId: RoutineStageId) => StageExecutionStatus;
  reminders: RoutineReminder[];
  dismissReminder: (id: string) => void;
  // Suporte a testes controlados de horários sem precisar esperar o relógio real
  testTimeMinutesOverride: number | null;
  setTestTimeMinutesOverride: (minutes: number | null) => void;
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const userId = user?.id || "guest";

  // Override para testes de horários específicos (10:59, 11:00, 14:00, 16:00, etc.)
  const [testTimeMinutesOverride, setTestTimeMinutesOverride] = useState<number | null>(null);

  // Relógio oficial em America/Sao_Paulo
  const [spTime, setSpTime] = useState(() => getSaoPauloTime());

  // Estado do dia atual
  const [dayState, setDayState] = useState<RoutineDayState>(() => {
    const initialTime = getSaoPauloTime();
    return loadDayState(userId, initialTime.dateString);
  });

  // Estado da interface flutuante (salva preferência de minimizado)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem("rebuss_routine_expanded") === "true";
  });

  // Salva preferência de expansão
  useEffect(() => {
    localStorage.setItem("rebuss_routine_expanded", String(isExpanded));
  }, [isExpanded]);

  // Atualiza relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      const nowSP = getSaoPauloTime();
      setSpTime(nowSP);

      // Verificação de virada do dia em America/Sao_Paulo
      setDayState((prev) => {
        if (prev.data !== nowSP.dateString) {
          // Virou o dia: Carrega ou cria nova instância diária preservando a anterior
          const nextDayState = loadDayState(userId, nowSP.dateString);
          return nextDayState;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId]);

  // Recarrega o estado quando o usuário autenticado mudar
  useEffect(() => {
    const nowSP = getSaoPauloTime();
    const loaded = loadDayState(userId, nowSP.dateString);
    setDayState(loaded);
  }, [userId]);

  // Minutos efetivos considerando teste ou tempo real
  const effectiveMinutes = useMemo(() => {
    if (testTimeMinutesOverride !== null) {
      return testTimeMinutesOverride;
    }
    return spTime.minutesSinceMidnight;
  }, [testTimeMinutesOverride, spTime.minutesSinceMidnight]);

  // Classificação do momento operacional
  const classification = useMemo(() => {
    return classifyRoutine(effectiveMinutes, dayState.etapas);
  }, [effectiveMinutes, dayState.etapas]);

  // Etapa selecionada no painel (começa na etapa do horário ou atrasada)
  const [selectedStageId, setSelectedStageId] = useState<RoutineStageId>("etapa-1");

  // Sincroniza etapa selecionada com a etapa ativa do horário
  useEffect(() => {
    if (classification.selectedStageId) {
      setSelectedStageId(classification.selectedStageId);
    }
  }, [classification.selectedStageId]);

  // Lembretes discretos contextuais
  const [reminders, setReminders] = useState<RoutineReminder[]>([]);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<Set<string>>(
    new Set()
  );

  // Calcula lembretes ativos conforme horário e pendências
  useEffect(() => {
    const newReminders: RoutineReminder[] = [];

    // 1. Etapa começando ou próxima (dentro de 15 minutos)
    if (classification.tempoAteProximaMin > 0 && classification.tempoAteProximaMin <= 15) {
      const id = `proxima-${classification.horarioProximaFormatado}`;
      if (!dismissedReminderIds.has(id)) {
        newReminders.push({
          id,
          tipo: "proxima_em_breve",
          titulo: "Próxima etapa em breve",
          mensagem: `A etapa "${classification.proximaTarefa}" inicia em ${classification.tempoAteProximaMin} min.`,
          criadoEm: spTime.timeString,
        });
      }
    }

    // 2. Alerta de etapas atrasadas
    if (classification.etapasAtrasadas.length > 0) {
      classification.etapasAtrasadas.forEach((stgId) => {
        const id = `atrasada-${stgId}-${dayState.data}`;
        if (!dismissedReminderIds.has(id)) {
          const cfg = ROUTINE_STAGES.find((s) => s.id === stgId);
          newReminders.push({
            id,
            tipo: "etapa_atrasada",
            titulo: `Pendência: Etapa ${cfg?.numero}`,
            mensagem: `A etapa "${cfg?.nome}" está com horário expirado e ainda não foi finalizada.`,
            stageId: stgId,
            criadoEm: spTime.timeString,
          });
        }
      });
    }

    // 3. Todas as tarefas concluídas
    if (classification.todasConcluidas) {
      const id = `concluidas-${dayState.data}`;
      if (!dismissedReminderIds.has(id)) {
        newReminders.push({
          id,
          tipo: "todas_concluidas",
          titulo: "Rotina concluída com sucesso! 🎉",
          mensagem: "Todas as 4 etapas operacionais do dia foram finalizadas.",
          criadoEm: spTime.timeString,
        });
      }
    }

    setReminders(newReminders);
  }, [
    classification.tempoAteProximaMin,
    classification.horarioProximaFormatado,
    classification.proximaTarefa,
    classification.etapasAtrasadas,
    classification.todasConcluidas,
    dayState.data,
    dismissedReminderIds,
    spTime.timeString,
  ]);

  const dismissReminder = useCallback((id: string) => {
    setDismissedReminderIds((prev) => new Set(prev).add(id));
  }, []);

  // Alterna item do checklist
  const toggleChecklistItem = useCallback(
    (stageId: RoutineStageId, itemIndex: number) => {
      setDayState((prev) => {
        const currentStage = prev.etapas[stageId];
        const nextChecklist = {
          ...currentStage.checklist,
          [itemIndex]: !currentStage.checklist[itemIndex],
        };

        const updated: RoutineDayState = {
          ...prev,
          etapas: {
            ...prev.etapas,
            [stageId]: {
              ...currentStage,
              checklist: nextChecklist,
            },
          },
        };

        saveDayState(updated);
        return updated;
      });
    },
    []
  );

  // Alterna conclusão da etapa inteira
  const toggleStageCompleted = useCallback(
    (stageId: RoutineStageId) => {
      setDayState((prev) => {
        const currentStage = prev.etapas[stageId];
        const willBeCompleted = !currentStage.concluida;

        // Ao marcar a etapa como concluída, marca todos os itens do checklist como concluídos
        const stageConfig = ROUTINE_STAGES.find((s) => s.id === stageId)!;
        const nextChecklist: Record<number, boolean> = { ...currentStage.checklist };
        if (willBeCompleted) {
          stageConfig.checklistPadrao.forEach((_, idx) => {
            nextChecklist[idx] = true;
          });
        }

        const updated: RoutineDayState = {
          ...prev,
          etapas: {
            ...prev.etapas,
            [stageId]: {
              ...currentStage,
              concluida: willBeCompleted,
              concluidaEm: willBeCompleted ? new Date().toISOString() : null,
              checklist: nextChecklist,
            },
          },
        };

        saveDayState(updated);
        return updated;
      });
    },
    []
  );

  // Progresso geral do dia
  const progress = useMemo(() => {
    return calculateRoutineProgress(dayState);
  }, [dayState]);

  // Status de execução de uma etapa
  const getStageStatus = useCallback(
    (stageId: RoutineStageId): StageExecutionStatus => {
      const stageProgress = dayState.etapas[stageId];
      return getStageExecutionStatus(stageId, effectiveMinutes, stageProgress);
    },
    [dayState.etapas, effectiveMinutes]
  );

  const value = useMemo(
    () => ({
      currentTimeString: spTime.timeString,
      currentDateString: spTime.dateString,
      currentMinutes: effectiveMinutes,
      stages: ROUTINE_STAGES,
      dayState,
      classification,
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
    }),
    [
      spTime.timeString,
      spTime.dateString,
      effectiveMinutes,
      dayState,
      classification,
      selectedStageId,
      isExpanded,
      toggleChecklistItem,
      toggleStageCompleted,
      progress,
      getStageStatus,
      reminders,
      dismissReminder,
      testTimeMinutesOverride,
    ]
  );

  return (
    <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
  );
};

export function useRoutine(): RoutineContextType {
  const context = useContext(RoutineContext);
  if (!context) {
    throw new Error("useRoutine deve ser utilizado dentro de um RoutineProvider");
  }
  return context;
}

