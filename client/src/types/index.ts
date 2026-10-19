export type Perfil = "ADMIN" | "OPERADOR";

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  avatarUrl?: string | null;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    equipesCriadas: number;
  };
}

export interface MembroEquipeFixa {
  id: string;
  equipeId: string;
  nome: string;
  numero?: string | null;
  matricula?: string | null;
  cargo: string;
  funcao?: string | null;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface EquipeFixa {
  id: string;
  nome: string;
  regiao: "RJ" | "SP" | "SJC" | string;
  supervisor?: string | null;
  descricao?: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: {
    id: string;
    nome: string;
    email?: string;
  } | null;
  membros: MembroEquipeFixa[];
  _count?: {
    membros: number;
  };
}

export interface Ferramenta {
  id: string;
  nome: string;
  descricao?: string | null;
  slug: string;
  icone: string;
  rota: string;
  ativo: boolean;
  ordem: number;
}

export interface AtividadeRecente {
  id: string;
  tipo: string;
  descricao: string;
  detalhes?: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    perfil: Perfil;
  } | null;
}

export interface DashboardStats {
  totalEquipes: number;
  totalEquipesAtivas: number;
  totalMembros: number;
  totalFerramentas: number;
  regiaoStats: {
    regiao: string;
    totalEquipes: number;
  }[];
  atividadesRecentes: AtividadeRecente[];
}
