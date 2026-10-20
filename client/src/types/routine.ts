export type RoutineStageId = "etapa-1" | "etapa-2" | "etapa-3" | "etapa-4";

export type StageExecutionStatus =
  | "nao_iniciada"
  | "em_andamento"
  | "concluida"
  | "atrasada";

export interface RoutineStageConfig {
  id: RoutineStageId;
  numero: number;
  nome: string;
  tituloCurto: string;
  horarioInicioMin: number; // Minutos desde meia-noite (America/Sao_Paulo)
  horarioFimMin: number;
  horarioExibicao: string;
  objetivo: string;
  descricao: string;
  checklistPadrao: string[];
  acaoPrincipal: {
    texto: string;
    rota: string;
    tooltip?: string;
  };
  prioridade?: boolean;
}

export interface StageProgressState {
  concluida: boolean;
  concluidaEm: string | null; // ISO timestamp
  checklist: Record<number, boolean>; // índice do item -> true/false
}

export interface RoutineDayState {
  data: string; // "YYYY-MM-DD" em America/Sao_Paulo
  userId: string;
  etapas: Record<RoutineStageId, StageProgressState>;
  ultimaAtualizacao: string;
}

export interface RoutineCurrentClassification {
  activeTimeStageId: RoutineStageId | null; // Etapa determinada pelo relógio
  selectedStageId: RoutineStageId;          // Etapa atualmente visualizada no painel
  statusTexto: string;                      // Texto resumo do momento
  statusTipo: "fora_expediente" | "ativo" | "prioridade" | "transicao" | "fechamento";
  proximaTarefa: string;
  tempoAteProximaMin: number;
  horarioProximaFormatado: string;
  etapasAtrasadas: RoutineStageId[];
  todasConcluidas: boolean;
}

export interface RoutineReminder {
  id: string;
  tipo: "inicio_etapa" | "proxima_em_breve" | "etapa_atrasada" | "todas_concluidas";
  titulo: string;
  mensagem: string;
  stageId?: RoutineStageId;
  dispensado?: boolean;
  criadoEm: string;
}
