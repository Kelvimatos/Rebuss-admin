import "dotenv/config";
import prisma from "../lib/prisma.js";

export interface MembroInput {
  funcao: string;
  nome: string;
  matricula: string | null;
}

export interface EquipeRegionalInput {
  nome: string;
  regiao: "SJC" | "RJ";
  supervisor: string | null;
  descricao: string;
  integrantes: MembroInput[];
}

export const EQUIPES_SJC_RJ_DATA: EquipeRegionalInput[] = [
  {
    nome: "EQUIPE FIXA SJC",
    regiao: "SJC",
    supervisor: null,
    descricao: "Equipe Fixa Operacional — São José dos Campos (SJC)",
    integrantes: [
      { funcao: "Operador", nome: "Antonio de Souza", matricula: "109283" },
      { funcao: "Operador", nome: "Caique Daniel Alves dos Santos", matricula: "103881" },
      { funcao: "Operador", nome: "Carla Daniela Da Silva", matricula: "109504" },
      { funcao: "Operador", nome: "Caue Santos Da Silva", matricula: "108793" },
      { funcao: "Operador", nome: "Debora Ferreira do Nascimento", matricula: "106981" },
      { funcao: "Operador", nome: "Diego Barcelos Baptista", matricula: "104321" },
      { funcao: "Operador", nome: "Ednelson Miqueias Fernandes dos Santos", matricula: "104724" },
      { funcao: "Operador", nome: "Fabricio Coelho de Lima", matricula: "103910" },
      { funcao: "Operador", nome: "Francisco Pereira Batista de Oliveira", matricula: "106380" },
      { funcao: "Operador", nome: "Grazielle Galvao dos Santos Goncalves", matricula: "105394" },
      { funcao: "Operador", nome: "Guilherme Bretas", matricula: "109475" },
      { funcao: "Operador", nome: "Guilherme Elberle de Souza", matricula: "109303" },
      { funcao: "Operador", nome: "Joao Paulo de Oliveira Tavares", matricula: "104915" },
      { funcao: "Operador", nome: "Jose Antonio Biavati Marengo", matricula: "109403" },
      { funcao: "Operador", nome: "Juliana Cristina Diniz Goncalves", matricula: "103941" },
      { funcao: "Operador", nome: "Lucas Henrique Da Costa Vergilio", matricula: "108212" },
      { funcao: "Operador", nome: "Luiz Eduardo Alves Estigarribia", matricula: "109512" },
      { funcao: "Operador", nome: "Luiz Henrique Leao Baptista", matricula: "109550" },
      { funcao: "Operador", nome: "Matheus Ribeiro de Oliveira", matricula: "109367" },
      { funcao: "Operador", nome: "Nicolas Yuri Moreira de Oliveira", matricula: "105512" },
      { funcao: "Operador", nome: "Otavio Augusto de Brito Moreira", matricula: "104919" },
      { funcao: "Operador", nome: "Pillar Amorim Quaresma", matricula: "95562" },
      { funcao: "Operador", nome: "Saralisa Costa Moura", matricula: "108717" },
      { funcao: "Operador", nome: "Wenda Mirian Alves Dos Santos Valins", matricula: "109662" },
      { funcao: "Operador", nome: "Willian Barbosa Ferreira Machado", matricula: "109513" },
      { funcao: "Operador", nome: "Ygor Tairone da Costa Vergilio", matricula: "103882" },
      { funcao: "Operador", nome: "Suellen Helen da Costa Moura", matricula: "109706" },
    ],
  },
  {
    nome: "EQUIPE FIXA RJ — WALLACE",
    regiao: "RJ",
    supervisor: "Wallace Da Silva De Oliveira",
    descricao: "Equipe Fixa Operacional RJ — Supervisor Wallace Da Silva De Oliveira",
    integrantes: [
      { funcao: "Supervisor", nome: "Wallace Da Silva De Oliveira", matricula: null },
      { funcao: "Operador", nome: "Larissa Carvalho", matricula: null },
      { funcao: "Operador", nome: "Angélica Palácio", matricula: null },
      { funcao: "Operador", nome: "Ana Maria Enedina", matricula: null },
      { funcao: "Operador", nome: "Michel Gomes", matricula: null },
      { funcao: "Operador", nome: "Maria Dias", matricula: null },
      { funcao: "Operador", nome: "Aline Pedro", matricula: null },
      { funcao: "Operador", nome: "William Gama", matricula: null },
      { funcao: "Operador", nome: "Amanda da Silva de Lima (MARÇIA LIRA)", matricula: null },
      { funcao: "Operador", nome: "Vinicius Souza dos Santos", matricula: null },
      { funcao: "Operador", nome: "Daniela dos Santos Leite", matricula: null },
      { funcao: "Operador", nome: "Sara de Souza Araújo", matricula: null },
    ],
  },
  {
    nome: "EQUIPE FIXA RJ — NATALIA",
    regiao: "RJ",
    supervisor: "Natalia Duarte Da Silva Lopes",
    descricao: "Equipe Fixa Operacional RJ — Supervisora Natalia Duarte Da Silva Lopes",
    integrantes: [
      { funcao: "Supervisor", nome: "Natalia Duarte Da Silva Lopes", matricula: null },
      { funcao: "Operador", nome: "Celso Oliveira Da Silva Junior", matricula: null },
      { funcao: "Operador", nome: "Lucas Da Silva Freire", matricula: null },
      { funcao: "Operador", nome: "Carla Assis Da Costa Assis", matricula: null },
      { funcao: "Operador", nome: "Andrea de Souza Paes", matricula: null },
      { funcao: "Operador", nome: "Marlon Augusto da Silva", matricula: null },
      { funcao: "Operador", nome: "Luana Borges", matricula: null },
      { funcao: "Operador", nome: "Geysiane Rocha de Oliveira", matricula: null },
      { funcao: "Operador", nome: "Marcela Oliveira Marques Correia", matricula: null },
      { funcao: "Operador", nome: "Lucianne de Fatima Fernandes Almendra", matricula: null },
      { funcao: "Operador", nome: "Anderson De Araújo Miguel", matricula: null },
    ],
  },
  {
    nome: "EQUIPE FIXA RJ — CRISLAINE",
    regiao: "RJ",
    supervisor: "Crislaine Ferreira Guimaraes",
    descricao: "Equipe Fixa Operacional RJ — Supervisora Crislaine Ferreira Guimaraes",
    integrantes: [
      { funcao: "Supervisor", nome: "Crislaine Ferreira Guimaraes", matricula: null },
      { funcao: "Operador", nome: "Cleidilaine Ferreira Guimaraes", matricula: null },
      { funcao: "Operador", nome: "Paula Denise", matricula: null },
      { funcao: "Operador", nome: "Ricardo Joao Verissimo", matricula: null },
      { funcao: "Operador", nome: "Maria Claudia Augusto", matricula: null },
      { funcao: "Operador", nome: "Joao Victor Augusto", matricula: null },
      { funcao: "Operador", nome: "Nathaly Marques", matricula: null },
      { funcao: "Operador", nome: "Kevin Mozarth De Almeida", matricula: null },
      { funcao: "Operador", nome: "Solange Da Cruz", matricula: null },
    ],
  },
  {
    nome: "EQUIPE FIXA RJ — BRUNO SANTANA",
    regiao: "RJ",
    supervisor: "Bruno Santana",
    descricao: "Equipe Fixa Operacional RJ — Supervisor Bruno Santana",
    integrantes: [
      { funcao: "Supervisor", nome: "Bruno Santana", matricula: null },
      { funcao: "Operador", nome: "ROGÉRIO DE ARAUJO SILVA", matricula: null },
      { funcao: "Operador", nome: "DAVI ARNALDO DE SOUZA", matricula: null },
      { funcao: "Operador", nome: "Samuel Romero Lopes", matricula: null },
      { funcao: "Operador", nome: "Janderson Barbosa Monteiro", matricula: null },
      { funcao: "Operador", nome: "THAMIREZ SANTOS SANTANA", matricula: null },
      { funcao: "Operador", nome: "Camila de Oliveira Silva", matricula: null },
      { funcao: "Operador", nome: "Amanda de Moraes Corrêa", matricula: null },
      { funcao: "Operador", nome: "Lucimar Marques Serafina", matricula: null },
      { funcao: "Operador", nome: "Eliane Angelica dos Santos de Lima", matricula: null },
      { funcao: "Operador", nome: "Rayna Romero Nunes de Azevedo", matricula: null },
      { funcao: "Operador", nome: "Jonathan Pereira Mello", matricula: null },
    ],
  },
];

export async function seedSjcAndRjTeams() {
  console.log("==================================================");
  console.log("   INICIANDO CARGA DAS EQUIPES FIXAS SJC E RJ     ");
  console.log("==================================================");

  // Remove empty test-only "Equipe Vale" stubs with 0 members if present
  const emptyStubs = await prisma.equipeFixa.findMany({
    where: {
      nome: "Equipe Vale",
      regiao: "SJC",
      membros: { none: {} },
    },
  });

  if (emptyStubs.length > 0) {
    await prisma.equipeFixa.deleteMany({
      where: {
        id: { in: emptyStubs.map((s) => s.id) },
      },
    });
    console.log(`[LIMPEZA] ${emptyStubs.length} registro(s) vazio(s) de teste ("Equipe Vale") removidos.`);
  }

  let equipesProcessadas = 0;
  let integrantesProcessados = 0;

  for (const eq of EQUIPES_SJC_RJ_DATA) {
    await prisma.$transaction(async (tx) => {
      let equipe = await tx.equipeFixa.findFirst({
        where: {
          nome: eq.nome,
          regiao: eq.regiao,
        },
        include: {
          membros: true,
        },
      });

      if (!equipe) {
        equipe = await tx.equipeFixa.create({
          data: {
            nome: eq.nome,
            regiao: eq.regiao,
            supervisor: eq.supervisor,
            descricao: eq.descricao,
            ativo: true,
          },
          include: {
            membros: true,
          },
        });
        console.log(
          `[CRIADA] [${eq.regiao}] ${eq.nome} | Supervisor: ${eq.supervisor || "—"}`
        );
      } else {
        if (equipe.supervisor !== eq.supervisor || equipe.descricao !== eq.descricao) {
          equipe = await tx.equipeFixa.update({
            where: { id: equipe.id },
            data: {
              supervisor: eq.supervisor,
              descricao: eq.descricao,
            },
            include: { membros: true },
          });
        }
        console.log(
          `[EXISTENTE] [${eq.regiao}] ${eq.nome} | Supervisor: ${eq.supervisor || "—"}`
        );
      }

      equipesProcessadas++;

      const membrosExistentes = equipe.membros;

      for (let i = 0; i < eq.integrantes.length; i++) {
        const integrante = eq.integrantes[i];
        const ordem = i + 1;
        const numeroStr = ordem < 10 ? `0${ordem}` : `${ordem}`;

        const membroExistente = membrosExistentes.find(
          (m) =>
            m.nome.trim() === integrante.nome.trim() &&
            ((m.matricula === null && integrante.matricula === null) ||
              m.matricula === integrante.matricula)
        );

        if (!membroExistente) {
          await tx.membroEquipeFixa.create({
            data: {
              equipeId: equipe.id,
              nome: integrante.nome,
              cargo: integrante.funcao,
              funcao: integrante.funcao,
              matricula: integrante.matricula,
              numero: numeroStr,
              ordem,
            },
          });
          integrantesProcessados++;
        } else {
          await tx.membroEquipeFixa.update({
            where: { id: membroExistente.id },
            data: {
              nome: integrante.nome,
              cargo: integrante.funcao,
              funcao: integrante.funcao,
              matricula: integrante.matricula,
              numero: numeroStr,
              ordem,
            },
          });
          integrantesProcessados++;
        }
      }
    });
  }

  console.log("==================================================");
  console.log(`Total de Equipes SJC/RJ Processadas: ${equipesProcessadas}`);
  console.log(`Total de Integrantes SJC/RJ Processados: ${integrantesProcessados}`);
  console.log("==================================================");
}

if (
  process.argv[1]?.endsWith("seed-sjc-rj-teams.ts") ||
  process.argv[1]?.endsWith("seed-sjc-rj-teams.js")
) {
  seedSjcAndRjTeams()
    .then(() => {
      console.log("Importação de equipes SJC e RJ concluída com sucesso!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erro na importação SJC/RJ:", err);
      process.exit(1);
    });
}

