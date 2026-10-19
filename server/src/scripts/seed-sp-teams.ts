import "dotenv/config";
import prisma from "../lib/prisma.js";

interface MembroInput {
  funcao: string;
  nome: string;
  matricula: string | null;
}

interface EquipeInput {
  nome: string;
  supervisor: string;
  integrantes: MembroInput[];
}

export const EQUIPES_SP_DATA: EquipeInput[] = [
  {
    nome: "EQUIPE FIXA SP — ELAINE GIANNETTI",
    supervisor: "Elaine Giannetti",
    integrantes: [
      { funcao: "Supervisor", nome: "Elaine Giannetti", matricula: "85151" },
      { funcao: "Operador de Sistema", nome: "Kailane de Jesus", matricula: "88769" },
      { funcao: "Chefe de Grupo", nome: "Gabriel Francisco Albuquerque", matricula: "105249" },
      { funcao: "Contador", nome: "Priscila Flawers de Souza Adão", matricula: "87587" },
      { funcao: "Contador", nome: "Felix Chaves dos Santos", matricula: "89938" },
      { funcao: "Contador", nome: "Andreza Tauany da Silva", matricula: "101318" },
      { funcao: "Contador", nome: "Yasmin Lima da Silva", matricula: "95849" },
      { funcao: "Contador", nome: "Ana Valéria Rodrigues", matricula: "88888" },
      { funcao: "Contador", nome: "Karina Mariana de Oliveira", matricula: "106507" },
      { funcao: "Contador", nome: "Adriana Cristina Ferreira dos Santos", matricula: "82583" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — JEFFERSON KLEBER",
    supervisor: "Jefferson Kleber",
    integrantes: [
      { funcao: "Supervisor", nome: "Jefferson Kleber", matricula: "91346" },
      { funcao: "Operador", nome: "Laiza Milene de Alencar", matricula: "72907" },
      { funcao: "Operador", nome: "Paulo Cesar Monteiro da Silva Quintino", matricula: "98160" },
      { funcao: "Operador", nome: "Caio Henrique de Almeida", matricula: "89901" },
      { funcao: "Operador", nome: "Giovanna Natallina Matos Ferreira", matricula: "106617" },
      { funcao: "Operador", nome: "Neci Ferreira de Lemos", matricula: "106694" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — LUIZ HENRIQUE",
    supervisor: "Luiz Henrique",
    integrantes: [
      { funcao: "Supervisor", nome: "Luiz Henrique", matricula: "93456" },
      { funcao: "Chefe de Grupo", nome: "Mariana Penckal", matricula: "88909" },
      { funcao: "Operador", nome: "Dailaine Aparecida Souza Sebastiao", matricula: "106698" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — MALLY ABREU",
    supervisor: "Mally Abreu",
    integrantes: [
      { funcao: "Supervisor", nome: "Mally Abreu", matricula: "97627" },
      { funcao: "Auxiliar", nome: "Edilandia Pires Ferreira", matricula: "94467" },
      { funcao: "Chefe de Grupo", nome: "Carlos William", matricula: "84749" },
      { funcao: "Chefe de Grupo", nome: "Allan Prates do Nascimento", matricula: "106421" },
      { funcao: "Operador", nome: "Weslley José da Silva Santos", matricula: "102328" },
      { funcao: "Operador", nome: "Hilda Caroline Pinel", matricula: "104631" },
      { funcao: "Operador", nome: "Julio Santos Dias Leite", matricula: "82059" },
      { funcao: "Operador", nome: "Matheus de Oliveira Borges", matricula: "100707" },
      { funcao: "Operador", nome: "Pedro Lucas Mendes da Silva", matricula: "91841" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — VITOR LIMA",
    supervisor: "Vitor Da Silva Lima",
    integrantes: [
      { funcao: "Supervisor", nome: "Vitor Da Silva Lima", matricula: "62854" },
      { funcao: "Auxiliar", nome: "Renan Lins", matricula: "84887" },
      { funcao: "Operador", nome: "Edson Souza", matricula: "86197" },
      { funcao: "Chefe de Grupo", nome: "João Carlos", matricula: "65887" },
      { funcao: "Operador", nome: "Raquel Maria", matricula: "91900" },
      { funcao: "Operador", nome: "Pedro Henrique Lins Do Bonfim", matricula: "105900" },
      { funcao: "Operador", nome: "Natanael Vicente", matricula: "99583" },
      { funcao: "Operador", nome: "Franciele Vitória", matricula: "88494" },
      { funcao: "Operador", nome: "Alex Diniz", matricula: "101531" },
      { funcao: "Operador", nome: "Michele Aleixo", matricula: "101337" },
      { funcao: "Operador", nome: "Daniel Carneiro", matricula: "101342" },
      { funcao: "Chefe de Grupo", nome: "Daniel Araújo", matricula: "86653" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — RODOLPHO DE MELO",
    supervisor: "Rodolpho de Melo",
    integrantes: [
      { funcao: "Supervisor", nome: "Rodolpho de Melo", matricula: "81143" },
      { funcao: "Contador", nome: "Mayara Ianguas", matricula: "84548" },
      { funcao: "Contador", nome: "Flávia Silva", matricula: "101382" },
      { funcao: "Contador", nome: "Patricia Oliveira Gomes", matricula: "89750" },
      { funcao: "Contador", nome: "Diego Cortez", matricula: "105356" },
      { funcao: "Contador", nome: "Patrícia Queiroz", matricula: "104896" },
      { funcao: "Contador", nome: "André Luiz Cândido", matricula: "104002" },
      { funcao: "Contador", nome: "Joseane Ferreira Alves", matricula: null },
      { funcao: "Contador", nome: "Marcos Moraes", matricula: "64935" },
      { funcao: "Contador", nome: "Ana Paula de Andrade", matricula: "98414" },
      { funcao: "Contador", nome: "Jeferson da Conceicao", matricula: "74529" },
      { funcao: "Contador", nome: "Arthur Nicolas Martins", matricula: "99524" },
      { funcao: "Contador", nome: "Robson Aluísio", matricula: "103804" },
      { funcao: "Contador", nome: "Gabriel Ferreira Prado", matricula: "99573" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — ADRIANE CAROLINE",
    supervisor: "Adriane Caroline",
    integrantes: [
      { funcao: "Supervisor", nome: "Adriane Caroline", matricula: "90336" },
      { funcao: "Operador de PC", nome: "Andrew Andriely Guedes", matricula: "88251" },
      { funcao: "Chefe de Grupo", nome: "Thauany Vitória", matricula: "104495" },
      { funcao: "Operador", nome: "Andrew Leandro da Rocha Cavalcanti", matricula: "92888" },
      { funcao: "Operador", nome: "Paola Victoria Correa", matricula: "88250" },
      { funcao: "Operador", nome: "Willian Cristiano Lopes", matricula: "60072" },
      { funcao: "Operador", nome: "Eduardo Laércio Martins", matricula: "83761" },
      { funcao: "Operador", nome: "David Michel do Nascimento", matricula: "99113" },
      { funcao: "Operador", nome: "Paloma Bianca Nascimento", matricula: "109118" },
      { funcao: "Operador", nome: "Igor Lima dos Anjos", matricula: "105029" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — SHEILA TEIXEIRA",
    supervisor: "Sheila Teixeira Alfenas",
    integrantes: [
      { funcao: "Supervisor", nome: "Sheila Teixeira Alfenas", matricula: "72125" },
      { funcao: "Contador", nome: "Tatiana Oliveira Alencar", matricula: "92923" },
      { funcao: "Contador", nome: "Alexsandro Da Silva Martins", matricula: "94402" },
      { funcao: "Contador", nome: "Daniela Guilherne da Silva", matricula: "76652" },
      { funcao: "Contador", nome: "Ana Paula Teixeira", matricula: "91096" },
      { funcao: "Contador", nome: "Katiane da Silva Paiva", matricula: "105516" },
      { funcao: "Contador", nome: "Julio Soares Barbosa", matricula: "102099" },
      { funcao: "Contador", nome: "Jacqueline Rodrigues Candido", matricula: "100916" },
      { funcao: "Contador", nome: "Jaqueline Gonçalves da Silva", matricula: "62819" },
      { funcao: "Contador", nome: "Katia Vitor Dos Santos Carvalho", matricula: "92859" },
      { funcao: "Contador", nome: "Bruna Tiano Pires", matricula: "89735" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — DANILO SANTOS",
    supervisor: "Danilo Santos",
    integrantes: [
      { funcao: "Supervisor", nome: "Danilo Santos", matricula: "84293" },
      { funcao: "Contador", nome: "Carlos Weslley", matricula: "104968" },
      { funcao: "Contador", nome: "Cleiton Costa da Silva", matricula: "98469" },
      { funcao: "Contador", nome: "Jhow Lenno Santos", matricula: "98949" },
      { funcao: "Contador", nome: "Diego Cortez", matricula: "106368" },
      { funcao: "Contador", nome: "Rosangela Ferreira Leite Alves", matricula: "84330" },
      { funcao: "Contador", nome: "Iraneide Albuquerque", matricula: "91255" },
      { funcao: "Contador", nome: "Raphael Marquezini Antonio de Lima", matricula: "104654" },
      { funcao: "Contador", nome: "Patricia Queiroz", matricula: "104896" },
      { funcao: "Contador", nome: "Carlos Augusto", matricula: "77150" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — EMERSON JOAQUIM",
    supervisor: "Emerson Joaquim",
    integrantes: [
      { funcao: "Supervisor", nome: "Emerson Joaquim", matricula: "85146" },
      { funcao: "Contador", nome: "Rodrigo Corsi Dos Santos", matricula: "101339" },
      { funcao: "Contador", nome: "Bruno Eduardo Santana Da Silva", matricula: "99847" },
      { funcao: "Contador", nome: "Renan Melo Ferreira", matricula: "94406" },
      { funcao: "Contador", nome: "Ana Carolline Santos Ribeiro", matricula: "101811" },
      { funcao: "Contador", nome: "Lucineide Pereira Hengler", matricula: "74619" },
      { funcao: "Contador", nome: "Bruna Ribeiro Bastos Silva", matricula: "106675" },
      { funcao: "Contador", nome: "Debora Cristina Peralta", matricula: "102544" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — MATHEUS CORDOVIL",
    supervisor: "Matheus Cordovil",
    integrantes: [
      { funcao: "Supervisor", nome: "Matheus Cordovil", matricula: "83005" },
      { funcao: "Chefe de Grupo", nome: "Isadora Ferreira", matricula: "93313" },
      { funcao: "Chefe de Grupo", nome: "Nielly Cristovam", matricula: "86888" },
      { funcao: "Chefe de Grupo", nome: "Maria Niclecia", matricula: "85960" },
      { funcao: "Chefe de Grupo", nome: "Lizianny Sandrielly", matricula: "105330" },
      { funcao: "Operador", nome: "Shirley Barbosa", matricula: "92947" },
      { funcao: "Operador", nome: "Gustavo Assis", matricula: "106869" },
      { funcao: "Operador", nome: "Caroline Belo", matricula: "106870" },
      { funcao: "Operador", nome: "Emerson Cristovam", matricula: "94424" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — ALEX PEIXINHO",
    supervisor: "Alex Peixinho",
    integrantes: [
      { funcao: "Supervisor", nome: "Alex Peixinho", matricula: "100334" },
      { funcao: "Contador", nome: "Jean Carlos da Silva", matricula: "105230" },
      { funcao: "Contador", nome: "Joel Leao Roque", matricula: "91973" },
      { funcao: "Contador", nome: "Jonathan Souza de Oliveira", matricula: "107260" },
      { funcao: "Contador", nome: "Katia Cristina Galvao", matricula: "102261" },
      { funcao: "Contador", nome: "Leide Nazilde Nogueira De Aquino", matricula: "106400" },
      { funcao: "Contador", nome: "Marcos Vinícius Almeida", matricula: "105667" },
      { funcao: "Contador", nome: "Daiany Dionisio Rocha", matricula: "108808" },
      { funcao: "Contador", nome: "Iago Patrick de Oliveira", matricula: "108807" },
      { funcao: "Contador", nome: "Samanta Sanchez", matricula: "77658" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — JOAQUIM ALVES",
    supervisor: "Joaquim Alves dos Santos Souza",
    integrantes: [
      { funcao: "Supervisor", nome: "Joaquim Alves dos Santos Souza", matricula: "107244" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — LAIZA MILENE",
    supervisor: "Laiza Milene de Alencar",
    integrantes: [
      { funcao: "Supervisor", nome: "Laiza Milene de Alencar", matricula: "72907" },
      { funcao: "Contador", nome: "Kelly Sabrina Garcia Dias", matricula: "103683" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — GLENDA",
    supervisor: "Glenda",
    integrantes: [
      { funcao: "Supervisor", nome: "Glenda", matricula: "92460" },
      { funcao: "Contador", nome: "Cristiane Lima Silva", matricula: "104566" },
      { funcao: "Contador", nome: "Natan Alves dos Santos", matricula: "92556" },
      { funcao: "Contador", nome: "Ryan Gabriel", matricula: "103661" },
      { funcao: "Contador", nome: "Elaine Araujo", matricula: "73712" },
      { funcao: "Contador", nome: "Emerson Cristovam", matricula: "94424" },
      { funcao: "Contador", nome: "Robson Aluizio", matricula: "103804" },
      { funcao: "Contador", nome: "Flavio Henrique", matricula: "89667" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — RODOLFO TAVARES",
    supervisor: "Rodolfo Tavares",
    integrantes: [
      { funcao: "Supervisor", nome: "Rodolfo Tavares", matricula: null },
      { funcao: "Contador", nome: "Patricia dos Santos Cavalcante", matricula: "93760" },
      { funcao: "Contador", nome: "Tayna Karoline Marcolina Da Silva", matricula: "105376" },
      { funcao: "Contador", nome: "Vitoria Souza Eias", matricula: "105374" },
      { funcao: "Contador", nome: "Swyene Braz de Brito", matricula: "103270" },
      { funcao: "Contador", nome: "Joao Carlos Silva", matricula: "93064" },
      { funcao: "Contador", nome: "Dyllan Michell Inocencio Caetano Santana", matricula: "84327" },
      { funcao: "Contador", nome: "Elaine Rodrigues Barbosa", matricula: "89662" },
      { funcao: "Contador", nome: "Karina Mariana de Oliveira", matricula: "106507" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — ALINE CRISTINA",
    supervisor: "Aline Cristina",
    integrantes: [
      { funcao: "Supervisor", nome: "Aline Cristina", matricula: "74188" },
      { funcao: "Contador", nome: "Flávio Henrique de Santos Sales", matricula: "89667" },
      { funcao: "Contador", nome: "Aline Torres das Neves", matricula: "91169" },
      { funcao: "Contador", nome: "Simone Gonçalves Lins", matricula: "105573" },
      { funcao: "Contador", nome: "Ana Clara Aparecida Lins", matricula: "105753" },
      { funcao: "Contador", nome: "Caio Henrique de Almeida Silva", matricula: "89901" },
      { funcao: "Contador", nome: "Michael Nogueira Pinheiro", matricula: "106676" },
      { funcao: "Contador", nome: "Allexia Prates Nascimento", matricula: "106513" },
      { funcao: "Contador", nome: "Leonardo Luiz de Souza Santos", matricula: "95212" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — DOUGLAS APOLONIO",
    supervisor: "Douglas Apolonio da Silva",
    integrantes: [
      { funcao: "Supervisor", nome: "Douglas Apolonio da Silva", matricula: "65853" },
      { funcao: "Chefe de Grupo", nome: "Carlos Alberto Santos Freire", matricula: "84814" },
      { funcao: "Chefe de Grupo", nome: "Andréia Nascimento Carvalho", matricula: "87918" },
      { funcao: "Contador", nome: "Rogerio Santana Souza", matricula: "65920" },
      { funcao: "Contador", nome: "Vinicius Pereira da Silva Macedo", matricula: "97012" },
      { funcao: "Contador", nome: "Bianca Pereira da Silva Seixas", matricula: "62862" },
      { funcao: "Contador", nome: "Gabriel Reis Souza", matricula: "105810" },
      { funcao: "Contador", nome: "Carlos Henrique Pereira S.", matricula: "103098" },
    ],
  },
  {
    nome: "EQUIPE FIXA SP — VAGNER RODRIGUES",
    supervisor: "Vagner Rodrigues Patez",
    integrantes: [
      { funcao: "Supervisor", nome: "Vagner Rodrigues Patez", matricula: "94339" },
      { funcao: "Operador de Sistema", nome: "Giulia Teixeira Da Silva", matricula: "91880" },
      { funcao: "Chefe de Grupo", nome: "Alan Jonathan dos Santos Silva", matricula: "91288" },
      { funcao: "Operador", nome: "Barbara de Souza Schumacher", matricula: "104180" },
      { funcao: "Operador", nome: "Valeria Cristiane Capitani Quadro", matricula: "65840" },
      { funcao: "Operador", nome: "Veronica Paula De Oliveira Pereira", matricula: "103792" },
      { funcao: "Operador", nome: "Matheus Neves dos Santos", matricula: "103907" },
      { funcao: "Operador", nome: "Michael Nogueira Pinheiro", matricula: "106676" },
      { funcao: "Operador", nome: "Tatiana da Silva de Souza", matricula: "95600" },
      { funcao: "Operador", nome: "Ana Paula Silva de Andrade", matricula: "98414" },
      { funcao: "Operador", nome: "Suelen Blaia Santos", matricula: "86280" },
    ],
  },
];

export async function seedSpTeams() {
  console.log("==================================================");
  console.log("   INICIANDO CARGA DAS EQUIPES FIXAS DE SP      ");
  console.log("==================================================");

  let equipesProcessadas = 0;
  let integrantesCadastrados = 0;

  for (const eq of EQUIPES_SP_DATA) {
    // 1. Localiza ou cria a equipe
    let equipe = await prisma.equipeFixa.findFirst({
      where: {
        nome: eq.nome,
        regiao: "SP",
      },
      include: {
        membros: true,
      },
    });

    if (!equipe) {
      equipe = await prisma.equipeFixa.create({
        data: {
          nome: eq.nome,
          regiao: "SP",
          supervisor: eq.supervisor,
          descricao: `Equipe Fixa Operacional - Supervisor(a) ${eq.supervisor}`,
          ativo: true,
        },
        include: {
          membros: true,
        },
      });
      console.log(`[CRIADA] ${eq.nome} | Supervisor: ${eq.supervisor}`);
    } else {
      // Atualiza o supervisor caso necessário
      if (equipe.supervisor !== eq.supervisor) {
        equipe = await prisma.equipeFixa.update({
          where: { id: equipe.id },
          data: { supervisor: eq.supervisor },
          include: { membros: true },
        });
      }
      console.log(`[EXISTENTE] ${eq.nome} | Supervisor: ${eq.supervisor}`);
    }

    equipesProcessadas++;

    // 2. Reconcilia integrantes de forma estritamente idempotente
    const membrosExistentes = equipe.membros;

    for (let i = 0; i < eq.integrantes.length; i++) {
      const integrante = eq.integrantes[i];
      const ordem = i + 1;
      const numeroStr = ordem < 10 ? `0${ordem}` : `${ordem}`;

      // Localiza por nome e matrícula dentro da mesma equipe
      const membroExistente = membrosExistentes.find(
        (m) =>
          m.nome.trim().toLowerCase() === integrante.nome.trim().toLowerCase() &&
          ((m.matricula === null && integrante.matricula === null) ||
            m.matricula === integrante.matricula)
      );

      if (!membroExistente) {
        await prisma.membroEquipeFixa.create({
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
        integrantesCadastrados++;
      } else {
        // Atualiza campos caso tenham divergência
        await prisma.membroEquipeFixa.update({
          where: { id: membroExistente.id },
          data: {
            cargo: integrante.funcao,
            funcao: integrante.funcao,
            matricula: integrante.matricula,
            ordem,
          },
        });
        integrantesCadastrados++;
      }
    }
  }

  console.log("==================================================");
  console.log(`Total de Equipes de SP Processadas: ${equipesProcessadas}`);
  console.log(`Total de Integrantes de SP Processados: ${integrantesCadastrados}`);
  console.log("==================================================");
}

// Execução direta via CLI
if (process.argv[1]?.endsWith("seed-sp-teams.ts") || process.argv[1]?.endsWith("seed-sp-teams.js")) {
  seedSpTeams()
    .then(() => {
      console.log("Importação de equipes concluída com sucesso!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erro na importação:", err);
      process.exit(1);
    });
}

