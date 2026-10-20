import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";
import { usersService } from "../services/users.service.js";
import { User, Perfil } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/Dialog.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { EmptyState } from "../components/shared/EmptyState.js";
import {
  UserCheck,
  Plus,
  Shield,
  User as UserIcon,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal create/edit user state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<{
    nome: string;
    email: string;
    senha: string;
    perfil: Perfil;
    ativo: boolean;
  }>({
    nome: "",
    email: "",
    senha: "",
    perfil: "OPERADOR",
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usersService.getUsers();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openCreateUser = () => {
    setEditingUser(null);
    setForm({
      nome: "",
      email: "",
      senha: "",
      perfil: "OPERADOR",
      ativo: true,
    });
    setUserModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setForm({
      nome: user.nome,
      email: user.email,
      senha: "", // leave blank unless changing
      perfil: user.perfil,
      ativo: user.ativo,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }

    if (!editingUser && !form.senha) {
      toast.error("A senha é obrigatória para o cadastro de novos usuários.");
      return;
    }

    setFormLoading(true);
    try {
      if (editingUser) {
        const payload: any = {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
          ativo: form.ativo,
        };
        if (form.senha.trim()) {
          payload.senha = form.senha.trim();
        }

        const updated = await usersService.updateUser(editingUser.id, payload);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
        toast.success(`Usuário "${updated.nome}" atualizado com sucesso!`);
      } else {
        const created = await usersService.createUser({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          perfil: form.perfil,
          ativo: form.ativo,
        });
        setUsers((prev) => [created, ...prev]);
        toast.success(`Usuário "${created.nome}" cadastrado com sucesso!`);
      }
      setUserModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id && user.ativo) {
      toast.error("Você não pode desativar o seu próprio usuário conectado.");
      return;
    }

    try {
      const nextStatus = !user.ativo;
      const updated = await usersService.updateUserStatus(user.id, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ativo: updated.ativo } : u)));
      toast.success(
        `Usuário "${user.nome}" foi ${updated.ativo ? "ativado" : "desativado"} com sucesso.`
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do usuário.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Masthead */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            MÓDULO 05 · ADMINISTRAÇÃO DO SISTEMA
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Usuários e Acessos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Controle de credenciais corporativas e níveis de autorização (ADMIN e OPERADOR).
          </p>
        </div>

        <Button onClick={openCreateUser} className="gap-1.5 font-semibold shrink-0">
          <Plus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-8 pr-4 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
          REGISTROS: <strong className="text-foreground">{filteredUsers.length}</strong>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <Card>
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <EmptyState
          icon={<UserCheck className="h-5 w-5" />}
          title="Nenhum usuário encontrado"
          description="Nenhum usuário corresponde aos critérios de pesquisa informados."
          actionLabel="+ Cadastrar Novo Usuário"
          onAction={openCreateUser}
        />
      )}

      {/* Users Table */}
      {!loading && filteredUsers.length > 0 && (
        <Card className="overflow-hidden border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cadastrado em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-foreground font-mono font-semibold text-xs border border-border">
                            {u.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-foreground block">
                              {u.nome}
                            </span>
                            {isCurrent && (
                              <span className="font-mono text-[10px] text-primary">
                                Sessão atual
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                        {u.email}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={u.perfil === "ADMIN" ? "default" : "secondary"}
                          className="text-[10px] gap-1 font-bold"
                        >
                          {u.perfil === "ADMIN" ? (
                            <Shield className="h-3 w-3 text-primary" />
                          ) : (
                            <UserIcon className="h-3 w-3" />
                          )}
                          {u.perfil}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={u.ativo ? "success" : "destructive"} className="text-[10px]">
                          {u.ativo ? "Ativo" : "Desativado"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Status */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isCurrent && u.ativo}
                            onClick={() => handleToggleStatus(u)}
                            className={`h-7 px-2 text-[11px] gap-1 ${
                              u.ativo
                                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                : "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                            title={
                              isCurrent
                                ? "Você não pode desativar seu próprio acesso"
                                : u.ativo
                                ? "Desativar usuário"
                                : "Ativar usuário"
                            }
                          >
                            {u.ativo ? (
                              <>
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Desativar</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Ativar</span>
                              </>
                            )}
                          </Button>

                          {/* Edit User */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUser(u)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Editar informações do usuário"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Create/Edit User */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent onClose={() => setUserModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Novo Usuário Operacional"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize os dados e privilégios deste usuário."
                : "Cadastre um novo operador ou administrador para a plataforma REBUSS OPS."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4">
            <Input
              label="Nome Completo"
              placeholder="Ex: João da Silva"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              autoFocus
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="operador@rebuss.com.br"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <Input
              label={editingUser ? "Nova Senha (deixe em branco para não alterar)" : "Senha de Acesso"}
              type="password"
              placeholder="••••••••••••"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              helperText="Mínimo de 6 caracteres"
              required={!editingUser}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground/90 uppercase tracking-wider">
                Perfil de Acesso
              </label>
              <select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}
                className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="OPERADOR">OPERADOR (Visualização, cópia e escalas)</option>
                <option value="ADMIN">ADMIN (Controle total, equipes e usuários)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="userActive"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="userActive" className="text-xs font-medium text-foreground cursor-pointer">
                Usuário Ativo no Sistema
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={formLoading}
                onClick={() => setUserModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={formLoading}>
                {editingUser ? "Salvar Alterações" : "Cadastrar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

