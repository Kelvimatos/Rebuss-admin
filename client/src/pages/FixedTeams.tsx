import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";
import { teamsService } from "../services/teams.service.js";
import { EquipeFixa, MembroEquipeFixa } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/Dialog.js";
import { ConfirmDialog } from "../components/shared/ConfirmDialog.js";
import { EmptyState } from "../components/shared/EmptyState.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import {
  Users,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  UserPlus,
  ArrowUp,
  ArrowDown,
  FileText,
  ClipboardCopy,
  ChevronDown,
  ChevronUp,
  MapPin,
  Filter,
  UserCheck,
  Hash,
} from "lucide-react";

const REGIONS = [
  { id: "ALL", label: "Todas as Regiões" },
  { id: "SP", label: "São Paulo (SP)" },
  { id: "RJ", label: "Rio de Janeiro (RJ)" },
  { id: "SJC", label: "São José dos Campos (SJC)" },
];

export const FixedTeams: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [teams, setTeams] = useState<EquipeFixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">("all");
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Modals state
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<EquipeFixa | null>(null);
  const [teamForm, setTeamForm] = useState({
    nome: "",
    regiao: "SP",
    supervisor: "",
    descricao: "",
    ativo: true,
  });
  const [teamFormLoading, setTeamFormLoading] = useState(false);

  // Member modal state
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<MembroEquipeFixa | null>(null);
  const [memberForm, setMemberForm] = useState({
    nome: "",
    funcao: "Operador",
    matricula: "",
    numero: "",
  });
  const [memberFormLoading, setMemberFormLoading] = useState(false);

  // Confirm delete states
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<EquipeFixa | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<{
    teamId: string;
    member: MembroEquipeFixa;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await teamsService.getTeams({
        search: searchQuery,
        regiao: selectedRegion,
        ativo: statusFilter,
      });
      setTeams(data);

      // Expand all by default
      const initialExpanded: Record<string, boolean> = {};
      data.forEach((t) => {
        initialExpanded[t.id] = true;
      });
      setExpandedTeams(initialExpanded);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar equipes fixas.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRegion, statusFilter]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Clipboard copy helper
  const copyToClipboard = async (text: string, identifier: string, successMessage: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(identifier);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success(successMessage);
    } catch {
      toast.error("Não foi possível copiar para a área de transferência.");
    }
  };

  // Copy complete team formatted
  const handleCopyCompleteTeam = (team: EquipeFixa) => {
    const sortedMembers = [...team.membros].sort((a, b) => a.ordem - b.ordem);
    const memberLines = sortedMembers
      .map((m, idx) => {
        const num = m.numero || (idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`);
        const mat = m.matricula ? ` (Matrícula: ${m.matricula})` : " (Matrícula: —)";
        const func = m.funcao || m.cargo;
        return `${num} - ${m.nome} - ${func}${mat}`;
      })
      .join("\n");

    const formatted = `EQUIPE: ${team.nome.toUpperCase()}
REGIÃO: ${team.regiao.toUpperCase()}
${team.supervisor ? `SUPERVISOR: ${team.supervisor.toUpperCase()}\n` : ""}
${memberLines || "(Nenhum membro cadastrado nesta equipe)"}`;

    copyToClipboard(formatted, `team-${team.id}`, `Equipe "${team.nome}" copiada com sucesso!`);
  };

  // Copy names only
  const handleCopyTeamNames = (team: EquipeFixa) => {
    const sortedMembers = [...team.membros].sort((a, b) => a.ordem - b.ordem);
    const names = sortedMembers.map((m) => m.nome).join("\n");
    copyToClipboard(
      names || team.nome,
      `names-${team.id}`,
      `Nomes dos membros da equipe "${team.nome}" copiados!`
    );
  };

  // Copy member individual actions
  const handleCopyMemberName = (member: MembroEquipeFixa) => {
    copyToClipboard(member.nome, `name-${member.id}`, `Nome "${member.nome}" copiado!`);
  };

  const handleCopyMemberMatricula = (member: MembroEquipeFixa) => {
    if (!member.matricula) {
      toast.info(`O colaborador ${member.nome} não possui matrícula cadastrada (—).`);
      return;
    }
    copyToClipboard(
      member.matricula,
      `mat-${member.id}`,
      `Matrícula ${member.matricula} copiada!`
    );
  };

  const handleCopyMemberNameAndMatricula = (member: MembroEquipeFixa) => {
    const mat = member.matricula ? member.matricula : "—";
    const text = `${member.nome} | Matrícula: ${mat} | Função: ${member.funcao || member.cargo}`;
    copyToClipboard(text, `member-${member.id}`, `Dados de ${member.nome} copiados!`);
  };

  // Toggle expand
  const toggleExpand = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  // Open Create Team Modal
  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamForm({
      nome: "",
      regiao: selectedRegion !== "ALL" ? selectedRegion : "SP",
      supervisor: "",
      descricao: "",
      ativo: true,
    });
    setTeamModalOpen(true);
  };

  // Open Edit Team Modal
  const openEditTeam = (team: EquipeFixa) => {
    setEditingTeam(team);
    setTeamForm({
      nome: team.nome,
      regiao: team.regiao,
      supervisor: team.supervisor || "",
      descricao: team.descricao || "",
      ativo: team.ativo,
    });
    setTeamModalOpen(true);
  };

  // Save Team (Create or Update)
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.nome.trim()) {
      toast.error("O nome da equipe é obrigatório.");
      return;
    }

    setTeamFormLoading(true);
    try {
      if (editingTeam) {
        const updated = await teamsService.updateTeam(editingTeam.id, {
          nome: teamForm.nome,
          regiao: teamForm.regiao,
          supervisor: teamForm.supervisor || null,
          descricao: teamForm.descricao || null,
          ativo: teamForm.ativo,
        });
        setTeams((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
        toast.success(`Equipe "${updated.nome}" atualizada com sucesso!`);
      } else {
        const created = await teamsService.createTeam({
          nome: teamForm.nome,
          regiao: teamForm.regiao,
          supervisor: teamForm.supervisor || null,
          descricao: teamForm.descricao || null,
          ativo: teamForm.ativo,
        });
        setTeams((prev) => [created, ...prev]);
        setExpandedTeams((prev) => ({ ...prev, [created.id]: true }));
        toast.success(`Equipe "${created.nome}" cadastrada com sucesso!`);
      }
      setTeamModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar equipe.");
    } finally {
      setTeamFormLoading(false);
    }
  };

  // Delete Team
  const handleConfirmDeleteTeam = async () => {
    if (!deleteTeamTarget) return;
    setDeleteLoading(true);
    try {
      await teamsService.deleteTeam(deleteTeamTarget.id);
      setTeams((prev) => prev.filter((t) => t.id !== deleteTeamTarget.id));
      toast.success(`Equipe "${deleteTeamTarget.nome}" excluída com sucesso.`);
      setDeleteTeamTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir equipe.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Member Modal
  const openAddMember = (teamId: string) => {
    setTargetTeamId(teamId);
    setEditingMember(null);
    const team = teams.find((t) => t.id === teamId);
    const count = team ? team.membros.length + 1 : 1;
    const suggestedNum = count < 10 ? `0${count}` : `${count}`;

    setMemberForm({
      nome: "",
      funcao: "Operador",
      matricula: "",
      numero: suggestedNum,
    });
    setMemberModalOpen(true);
  };

  const openEditMember = (teamId: string, member: MembroEquipeFixa) => {
    setTargetTeamId(teamId);
    setEditingMember(member);
    setMemberForm({
      nome: member.nome,
      funcao: member.funcao || member.cargo,
      matricula: member.matricula || "",
      numero: member.numero || "",
    });
    setMemberModalOpen(true);
  };

  // Save Member
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeamId) return;
    if (!memberForm.nome.trim() || !memberForm.funcao.trim()) {
      toast.error("Nome e função do colaborador são obrigatórios.");
      return;
    }

    setMemberFormLoading(true);
    try {
      const matriculaValue = memberForm.matricula.trim() === "—" || memberForm.matricula.trim() === ""
        ? null
        : memberForm.matricula.trim();

      if (editingMember) {
        const updated = await teamsService.updateMember(targetTeamId, editingMember.id, {
          nome: memberForm.nome,
          cargo: memberForm.funcao,
          funcao: memberForm.funcao,
          matricula: matriculaValue,
          numero: memberForm.numero.trim() || undefined,
        });

        setTeams((prev) =>
          prev.map((team) => {
            if (team.id !== targetTeamId) return team;
            return {
              ...team,
              membros: team.membros.map((m) => (m.id === updated.id ? updated : m)),
            };
          })
        );
        toast.success(`Colaborador "${updated.nome}" atualizado!`);
      } else {
        const created = await teamsService.addMember(targetTeamId, {
          nome: memberForm.nome,
          cargo: memberForm.funcao,
          funcao: memberForm.funcao,
          matricula: matriculaValue,
          numero: memberForm.numero.trim() || undefined,
        });

        setTeams((prev) =>
          prev.map((team) => {
            if (team.id !== targetTeamId) return team;
            return {
              ...team,
              membros: [...team.membros, created],
            };
          })
        );
        toast.success(`Colaborador "${created.nome}" adicionado!`);
      }
      setMemberModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar integrante.");
    } finally {
      setMemberFormLoading(false);
    }
  };

  // Delete Member
  const handleConfirmDeleteMember = async () => {
    if (!deleteMemberTarget) return;
    setDeleteLoading(true);
    try {
      await teamsService.deleteMember(deleteMemberTarget.teamId, deleteMemberTarget.member.id);
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== deleteMemberTarget.teamId) return team;
          return {
            ...team,
            membros: team.membros.filter((m) => m.id !== deleteMemberTarget.member.id),
          };
        })
      );
      toast.success(`Colaborador "${deleteMemberTarget.member.nome}" removido.`);
      setDeleteMemberTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover membro.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Reorder Member
  const handleMoveMember = async (teamId: string, index: number, direction: "up" | "down") => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    const list = [...team.membros].sort((a, b) => a.ordem - b.ordem);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap positions
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Assign new sequential order values
    const payload = list.map((m, idx) => ({
      id: m.id,
      ordem: idx + 1,
    }));

    // Optimistic UI update
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          membros: list.map((m, idx) => ({ ...m, ordem: idx + 1 })),
        };
      })
    );

    try {
      await teamsService.reorderMembers(teamId, payload);
      toast.success("Ordem dos integrantes atualizada no PostgreSQL!");
    } catch {
      toast.error("Falha ao salvar nova ordem no servidor.");
      fetchTeams(); // Rollback
    }
  };

  const totalFilteredMembers = useMemo(
    () => teams.reduce((acc, t) => acc + t.membros.length, 0),
    [teams]
  );

  const allExpanded = useMemo(
    () => teams.length > 0 && teams.every((t) => expandedTeams[t.id] ?? true),
    [teams, expandedTeams]
  );

  const handleToggleAll = () => {
    const nextState = !allExpanded;
    const updated: Record<string, boolean> = {};
    teams.forEach((t) => {
      updated[t.id] = nextState;
    });
    setExpandedTeams(updated);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Masthead */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            MÓDULO 02 · GESTÃO DE EFETIVO
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Equipes Fixas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Controle nominal de supervisores, funções, matrículas e despacho padronizado por praça operacional.
          </p>
        </div>

        {isAdmin && (
          <Button onClick={openCreateTeam} className="gap-1.5 font-semibold shrink-0">
            <Plus className="h-4 w-4" />
            <span>Nova Equipe</span>
          </Button>
        )}
      </div>

      {/* Unified Architectural Filter & Region Ledger */}
      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {/* Top Row: Region Tabs + Live Tabular Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 bg-muted/20">
          <div className="flex flex-wrap items-center gap-1 -mb-px">
            {REGIONS.map((region) => {
              const active = selectedRegion === region.id;
              return (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={`relative px-3.5 py-3 text-xs transition-colors select-none border-b-2 ${
                    active
                      ? "border-primary text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                  }`}
                >
                  {region.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-4 py-2 font-mono text-[11px] text-muted-foreground tabular-nums">
            <span>
              EQUIPES: <strong className="text-foreground">{teams.length}</strong>
            </span>
            <span className="text-border">|</span>
            <span>
              EFETIVO LISTADO: <strong className="text-foreground">{totalFilteredMembers}</strong>
            </span>
          </div>
        </div>

        {/* Bottom Row: Search Input, Status Select & Expand/Collapse All */}
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por equipe, supervisor, integrante ou matrícula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/70"
              >
                <option value="all">Todas</option>
                <option value="true">Apenas Ativas</option>
                <option value="false">Apenas Inativas</option>
              </select>
            </div>

            {teams.length > 1 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {allExpanded ? "Recolher todas" : "Expandir todas"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {/* Empty State */}
      {!loading && teams.length === 0 && (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Nenhuma equipe fixa encontrada"
          description={
            searchQuery
              ? `Nenhum resultado corresponde à busca "${searchQuery}". Tente outros termos.`
              : "Não há equipes cadastradas para o filtro selecionado. Crie uma equipe ou selecione outra região."
          }
          actionLabel={isAdmin ? "+ Cadastrar Nova Equipe" : undefined}
          onAction={isAdmin ? openCreateTeam : undefined}
        />
      )}

      {/* Teams List */}
      {!loading && teams.length > 0 && (
        <div className="space-y-4">
          {teams.map((team) => {
            const isExpanded = expandedTeams[team.id] ?? true;
            const sortedMembers = [...team.membros].sort((a, b) => a.ordem - b.ordem);
            const totalIntegrantes = sortedMembers.length;

            return (
              <Card
                key={team.id}
                className={`overflow-hidden border-border transition-colors ${
                  !team.ativo ? "opacity-75 bg-card/60" : "bg-card"
                }`}
              >
                {/* Team Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3.5 sm:px-5 gap-3 border-b border-border bg-muted/20">
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      onClick={() => toggleExpand(team.id)}
                      className="p-1 rounded border border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground transition-colors mt-0.5 sm:mt-0"
                      title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
                          <MapPin className="h-2.5 w-2.5 mr-1 text-primary inline" />
                          {team.regiao}
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                          {team.nome}
                        </h3>
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          · {totalIntegrantes} {totalIntegrantes === 1 ? "integrante" : "integrantes"}
                        </span>
                        {!team.ativo && (
                          <Badge variant="secondary" className="text-[10px]">
                            Inativa
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {team.supervisor && (
                          <span className="inline-flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                              Supervisor(a): <strong className="font-medium text-foreground">{team.supervisor}</strong>
                            </span>
                          </span>
                        )}
                        {team.descricao && (
                          <span className="text-muted-foreground/80">
                            {team.descricao}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                    {/* Copy Full Team */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCompleteTeam(team)}
                      className="h-8 gap-1.5 text-xs font-medium"
                      title="Copiar equipe completa formatada para despacho"
                    >
                      {copiedId === `team-${team.id}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <ClipboardCopy className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>Copiar Equipe</span>
                    </Button>

                    {/* Copy Names Only */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyTeamNames(team)}
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      title="Copiar apenas os nomes dos integrantes"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Copiar Nomes</span>
                    </Button>

                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddMember(team.id)}
                          className="h-8 gap-1 text-xs text-primary font-medium hover:bg-primary/10"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Integrante</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTeam(team)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Editar equipe"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTeamTarget(team)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Excluir equipe"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Team Members Content */}
                {isExpanded && (
                  <div className="p-0">
                    {sortedMembers.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Nenhum integrante cadastrado nesta equipe.
                        </p>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddMember(team.id)}
                            className="mt-3 text-xs gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Adicionar primeiro integrante</span>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              <th className="py-2.5 px-4 w-12 text-center">#</th>
                              <th className="py-2.5 px-4 w-40">Função</th>
                              <th className="py-2.5 px-4">Nome Completo</th>
                              <th className="py-2.5 px-4 w-32 text-center">Matrícula</th>
                              <th className="py-2.5 px-4 text-right w-56">Cópia & Gestão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {sortedMembers.map((member, idx) => {
                              const matriculaDisplay = member.matricula ? member.matricula : "—";
                              const funcaoDisplay = member.funcao || member.cargo;
                              const rowNumber = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

                              return (
                                <tr
                                  key={member.id}
                                  className="group hover:bg-muted/30 transition-colors"
                                >
                                  <td className="py-2.5 px-4 text-center text-muted-foreground font-mono text-[11px] tabular-nums">
                                    {rowNumber}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <Badge
                                      variant={
                                        funcaoDisplay.toLowerCase().includes("supervisor")
                                          ? "default"
                                          : funcaoDisplay.toLowerCase().includes("chefe")
                                          ? "warning"
                                          : "secondary"
                                      }
                                      className="text-[10px]"
                                    >
                                      {funcaoDisplay}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 px-4 font-medium text-foreground">
                                    {member.nome}
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-mono text-xs font-semibold text-foreground tabular-nums">
                                    {matriculaDisplay}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* Copiar Nome */}
                                      <button
                                        onClick={() => handleCopyMemberName(member)}
                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                        title="Copiar apenas o Nome"
                                      >
                                        {copiedId === `name-${member.id}` ? (
                                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" />
                                        )}
                                      </button>

                                      {/* Copiar Matrícula */}
                                      <button
                                        onClick={() => handleCopyMemberMatricula(member)}
                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                        title="Copiar Matrícula"
                                      >
                                        {copiedId === `mat-${member.id}` ? (
                                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                          <Hash className="h-3.5 w-3.5" />
                                        )}
                                      </button>

                                      {/* Copiar Nome e Matrícula */}
                                      <button
                                        onClick={() => handleCopyMemberNameAndMatricula(member)}
                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                        title="Copiar Nome, Matrícula e Função"
                                      >
                                        {copiedId === `member-${member.id}` ? (
                                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5" />
                                        )}
                                      </button>

                                      {isAdmin && (
                                        <>
                                          <div className="h-3 w-px bg-border mx-1" />

                                          {/* Move Up */}
                                          <button
                                            disabled={idx === 0}
                                            onClick={() => handleMoveMember(team.id, idx, "up")}
                                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                                            title="Mover para cima"
                                          >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                          </button>

                                          {/* Move Down */}
                                          <button
                                            disabled={idx === sortedMembers.length - 1}
                                            onClick={() => handleMoveMember(team.id, idx, "down")}
                                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                                            title="Mover para baixo"
                                          >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                          </button>

                                          {/* Edit Member */}
                                          <button
                                            onClick={() => openEditMember(team.id, member)}
                                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            title="Editar integrante"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>

                                          {/* Delete Member */}
                                          <button
                                            onClick={() =>
                                              setDeleteMemberTarget({ teamId: team.id, member })
                                            }
                                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            title="Excluir integrante"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create/Edit Team */}
      <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
        <DialogContent onClose={() => setTeamModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Editar Equipe Fixa" : "Nova Equipe Fixa"}
            </DialogTitle>
            <DialogDescription>
              {editingTeam
                ? "Atualize as informações da equipe no sistema."
                : "Preencha os dados abaixo para cadastrar uma nova equipe operacional."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTeam} className="space-y-4">
            <Input
              label="Nome da Equipe"
              placeholder="Ex: EQUIPE FIXA SP — ELAINE GIANNETTI"
              value={teamForm.nome}
              onChange={(e) => setTeamForm({ ...teamForm, nome: e.target.value })}
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-foreground/90 uppercase tracking-wider">
                  Região
                </label>
                <select
                  value={teamForm.regiao}
                  onChange={(e) => setTeamForm({ ...teamForm, regiao: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="SP">São Paulo (SP)</option>
                  <option value="RJ">Rio de Janeiro (RJ)</option>
                  <option value="SJC">São José dos Campos (SJC)</option>
                  <option value="OUTRA">Outra Região</option>
                </select>
              </div>

              <Input
                label="Supervisor Responsável"
                placeholder="Ex: Elaine Giannetti"
                value={teamForm.supervisor}
                onChange={(e) => setTeamForm({ ...teamForm, supervisor: e.target.value })}
              />
            </div>

            <Input
              label="Descrição (Opcional)"
              placeholder="Ex: Operação diurna, supervisão centro"
              value={teamForm.descricao}
              onChange={(e) => setTeamForm({ ...teamForm, descricao: e.target.value })}
            />

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="teamActive"
                checked={teamForm.ativo}
                onChange={(e) => setTeamForm({ ...teamForm, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="teamActive" className="text-xs font-medium text-foreground cursor-pointer">
                Equipe Ativa para operações e escalas
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={teamFormLoading}
                onClick={() => setTeamModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={teamFormLoading}>
                {editingTeam ? "Salvar Alterações" : "Cadastrar Equipe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add/Edit Member */}
      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent onClose={() => setMemberModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editar Integrante" : "Adicionar Integrante à Equipe"}
            </DialogTitle>
            <DialogDescription>
              Preencha o nome completo, função e matrícula funcional do integrante.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMember} className="space-y-4">
            <Input
              label="Nome Completo"
              placeholder="Ex: Priscila Flawers de Souza Adão"
              value={memberForm.nome}
              onChange={(e) => setMemberForm({ ...memberForm, nome: e.target.value })}
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Função / Cargo"
                placeholder="Ex: Contador, Operador, Supervisor"
                value={memberForm.funcao}
                onChange={(e) => setMemberForm({ ...memberForm, funcao: e.target.value })}
                required
              />

              <Input
                label="Matrícula Funcional"
                placeholder="Ex: 87587 (ou —)"
                value={memberForm.matricula}
                onChange={(e) => setMemberForm({ ...memberForm, matricula: e.target.value })}
                helperText="Deixe em branco ou — caso não possua"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={memberFormLoading}
                onClick={() => setMemberModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={memberFormLoading}>
                {editingMember ? "Salvar Alterações" : "Adicionar Integrante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Team Dialog */}
      <ConfirmDialog
        open={!!deleteTeamTarget}
        onOpenChange={(open) => !open && setDeleteTeamTarget(null)}
        title={`Excluir equipe "${deleteTeamTarget?.nome}"?`}
        description="Esta ação removerá a equipe do banco de dados PostgreSQL de forma permanente."
        warningNote={
          deleteTeamTarget && deleteTeamTarget.membros.length > 0
            ? `Esta equipe possui ${deleteTeamTarget.membros.length} integrante(s) cadastrado(s). Todos serão permanentemente excluídos do sistema.`
            : undefined
        }
        isLoading={deleteLoading}
        onConfirm={handleConfirmDeleteTeam}
      />

      {/* Confirm Delete Member Dialog */}
      <ConfirmDialog
        open={!!deleteMemberTarget}
        onOpenChange={(open) => !open && setDeleteMemberTarget(null)}
        title={`Remover integrante "${deleteMemberTarget?.member.nome}"?`}
        description={`Deseja realmente remover este integrante da equipe?`}
        isLoading={deleteLoading}
        onConfirm={handleConfirmDeleteMember}
      />
    </div>
  );
};
