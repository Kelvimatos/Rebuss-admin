/**
 * REBUSS OPS — Serviço de Relatórios de Confirmações por Loja
 * 
 * Calcula e formata relatórios operacionais consolidados:
 * - Postos necessários
 * - Postos preenchidos
 * - Confirmados
 * - Recusados
 * - Pendentes
 * - Sem colaborador
 * - Percentual de confirmação
 */

const { AttendanceStatus } = require("./attendanceService");

class ReportService {
  constructor(attendanceService) {
    this.attendanceService = attendanceService;
  }

  /**
   * Gera o relatório estruturado por loja e data
   * 
   * @param {string} [dateFilter] - Filtro de data opcional YYYY-MM-DD
   * @returns {{ lojas: Array<Object>, resumoGeral: Object, dataConsulta: string }}
   */
  generateReport(dateFilter = null) {
    const scales = this.attendanceService.getAllScales();
    const filteredScales = dateFilter
      ? scales.filter((s) => s.data === dateFilter)
      : scales;

    const lojasReport = [];

    const resumoGeral = {
      totalLojas: 0,
      postosNecessarios: 0,
      postosPreenchidos: 0,
      confirmados: 0,
      recusados: 0,
      pendentes: 0,
      semColaborador: 0,
      percentualConfirmacao: 0,
    };

    for (const escala of filteredScales) {
      const postos = escala.postos || [];
      const postosNecessarios = escala.postosNecessarios || postos.length;
      const postosPreenchidos = postos.filter((p) => p.colaboradorNome).length;

      let confirmados = 0;
      let recusados = 0;
      let pendentes = 0;

      for (const p of postos) {
        if (p.status === AttendanceStatus.CONFIRMADO) {
          confirmados++;
        } else if (p.status === AttendanceStatus.RECUSADO) {
          recusados++;
        } else {
          pendentes++;
        }
      }

      const semColaborador = Math.max(0, postosNecessarios - postosPreenchidos);
      const percentual = postosPreenchidos > 0
        ? ((confirmados / postosPreenchidos) * 100).toFixed(1)
        : "0.0";

      lojasReport.push({
        escalaId: escala.id,
        loja: escala.loja,
        operacao: escala.operacao,
        data: escala.data,
        horario: escala.horario,
        postosNecessarios,
        postosPreenchidos,
        confirmados,
        recusados,
        pendentes,
        semColaborador,
        percentualConfirmacao: parseFloat(percentual),
      });

      // Acumula no resumo geral
      resumoGeral.totalLojas++;
      resumoGeral.postosNecessarios += postosNecessarios;
      resumoGeral.postosPreenchidos += postosPreenchidos;
      resumoGeral.confirmados += confirmados;
      resumoGeral.recusados += recusados;
      resumoGeral.pendentes += pendentes;
      resumoGeral.semColaborador += semColaborador;
    }

    resumoGeral.percentualConfirmacao = resumoGeral.postosPreenchidos > 0
      ? parseFloat(((resumoGeral.confirmados / resumoGeral.postosPreenchidos) * 100).toFixed(1))
      : 0;

    return {
      dataConsulta: dateFilter || "Todas as datas",
      lojas: lojasReport,
      resumoGeral,
    };
  }

  /**
   * Formata os dados em texto legível para terminal ou WhatsApp
   * 
   * @param {Object} reportData - Dados gerados por generateReport()
   * @returns {string}
   */
  formatTextReport(reportData) {
    let output = "📋 *RELATÓRIO DE ESCALAS*\n\n";

    if (!reportData.lojas || reportData.lojas.length === 0) {
      output += "Nenhuma escala registrada para o período consultado.\n";
      return output;
    }

    for (const loja of reportData.lojas) {
      output += `🏪 *${loja.loja}* (${loja.data})\n`;
      output += `• Postos necessários: ${loja.postosNecessarios}\n`;
      output += `• Preenchidos: ${loja.postosPreenchidos}\n`;
      output += `• Confirmados: ${loja.confirmados} ✅\n`;
      output += `• Recusados: ${loja.recusados} ❌\n`;
      output += `• Pendentes: ${loja.pendentes} ⏳\n`;
      if (loja.semColaborador > 0) {
        output += `• Sem colaborador: ${loja.semColaborador} ⚠️\n`;
      }
      output += `• Confirmação: ${loja.percentualConfirmacao}%\n\n`;
    }

    const geral = reportData.resumoGeral;
    output += "📊 *RESUMO GERAL*\n";
    output += `• Total de lojas: ${geral.totalLojas}\n`;
    output += `• Postos necessários: ${geral.postosNecessarios}\n`;
    output += `• Confirmados: ${geral.confirmados} ✅\n`;
    output += `• Recusados: ${geral.recusados} ❌\n`;
    output += `• Pendentes: ${geral.pendentes} ⏳\n`;
    if (geral.semColaborador > 0) {
      output += `• Sem colaborador: ${geral.semColaborador} ⚠️\n`;
    }
    output += `• Confirmação geral: ${geral.percentualConfirmacao}%\n`;

    return output.trim();
  }
}

module.exports = {
  ReportService,
};

