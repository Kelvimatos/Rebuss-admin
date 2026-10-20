import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";
import { authService } from "../services/auth.service.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { Camera, Trash2, Shield, CheckCircle2, KeyRound } from "lucide-react";

export const Profile: React.FC = () => {
  const { user, updateProfileName, updateAvatar, removeAvatar } = useAuth();
  const { toast } = useToast();

  const [nome, setNome] = useState(user?.nome || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Informe sua senha atual.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha de acesso atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar senha.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error("O nome deve ter no mínimo 2 caracteres.");
      return;
    }

    setNameLoading(true);
    try {
      await updateProfileName(trimmed);
      toast.success("Nome atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar nome.");
    } finally {
      setNameLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo excede o limite máximo permitido de 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate type
    const validMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type)) {
      toast.error("Formato inválido. Selecione uma imagem JPEG, PNG ou WebP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setAvatarLoading(true);
    try {
      await updateAvatar(selectedFile);
      toast.success("Foto de perfil atualizada com sucesso!");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "Falha no upload da foto.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    try {
      await removeAvatar();
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Foto de perfil removida com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover foto.");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Editorial Masthead */}
      <div className="border-b border-border pb-5 space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          MÓDULO 04 · CREDENCIAIS & CONTA
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Meu Perfil
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gerencie sua identificação nominal, foto de perfil e credenciais de segurança no Rebuss Ops.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Left Column: Avatar & Quick Info Card */}
        <Card className="md:col-span-1 border-border">
          <CardHeader className="text-center pb-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm">Identificação Visual</CardTitle>
            <CardDescription className="text-xs">
              Avatar exibido na barra operacional
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center pt-5">
            {/* Avatar display with preview support */}
            <div className="relative group my-2">
              <div className="h-24 w-24 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-secondary">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Prévia do avatar"
                    className="h-full w-full object-cover"
                  />
                ) : user?.avatarUrl && user.avatarUrl !== "/api/auth/profile/avatar" ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-primary">
                    {user?.nome ? user.nome.charAt(0).toUpperCase() : "U"}
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Avatar action buttons */}
            <div className="w-full space-y-2 mt-2">
              {selectedFile ? (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    isLoading={avatarLoading}
                    onClick={handleSaveAvatar}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Salvar Foto</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={avatarLoading}
                    onClick={handleCancelPreview}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 text-xs"
                    disabled={avatarLoading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 text-primary" />
                    <span>Alterar foto</span>
                  </Button>

                  {user?.avatarUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                      disabled={avatarLoading}
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover foto</span>
                    </Button>
                  )}
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-3">
              Formatos aceitos: JPEG, PNG e WebP. Máximo de 5 MB.
            </p>
          </CardContent>
        </Card>

        {/* Right Column: Name & Account Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Personal Details */}
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-sm">Informações Pessoais</CardTitle>
              <CardDescription className="text-xs">
                Atualize seu nome de exibição no sistema operacional
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleNameSubmit}>
              <CardContent className="space-y-4">
                <Input
                  label="Nome Completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  disabled={nameLoading}
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground/90 uppercase tracking-wider">
                    E-mail (Identificador de Login)
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-muted-foreground shadow-sm cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    O e-mail é gerenciado exclusivamente pelo administrador do sistema.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-2 border-t border-border/60">
                <Button type="submit" isLoading={nameLoading} className="shadow-sm">
                  Salvar alterações
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Card: Profile Credentials & Role Badge */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Privilégios e Perfil</CardTitle>
              <CardDescription className="text-xs">
                Seu nível de autorização no Rebuss Ops
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Perfil de Acesso
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {user?.perfil === "ADMIN"
                      ? "Acesso completo de administração, criação de equipes, usuários e ferramentas."
                      : "Acesso operacional às ferramentas, visualização de equipes fixas e cópia de escalas."}
                  </span>
                </div>
                <Badge
                  variant={user?.perfil === "ADMIN" ? "default" : "secondary"}
                  className="font-bold gap-1 text-xs px-2.5 py-1"
                >
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  {user?.perfil}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Status da Conta
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Sessão ativa e autenticada via PostgreSQL
                  </span>
                </div>
                <Badge variant="success" className="text-xs">
                  Ativo
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card: Security & Password Update */}
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Segurança e Redefinição de Senha
              </CardTitle>
              <CardDescription className="text-xs">
                Atualize sua credencial de acesso com hash criptográfico seguro (bcrypt)
              </CardDescription>
            </CardHeader>

            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-4">
                <Input
                  label="Senha Atual"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={passwordLoading}
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nova Senha (mín. 8 caracteres)"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={passwordLoading}
                    required
                  />
                  <Input
                    label="Confirmar Nova Senha"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={passwordLoading}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-2 border-t border-border/60">
                <Button type="submit" isLoading={passwordLoading} className="shadow-sm">
                  Atualizar senha
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

