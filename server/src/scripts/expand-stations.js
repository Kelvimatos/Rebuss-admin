const fs = require("fs");
const path = require("path");

const additionalSP = [
  // Linha 5 - Lilás
  { id: "sp-metro-capao-redondo", name: "Estação Capão Redondo", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6596, lon: -46.7686 },
  { id: "sp-metro-campo-limpo", name: "Estação Campo Limpo", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6495, lon: -46.7589 },
  { id: "sp-term-campo-limpo", name: "Terminal Campo Limpo", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.6508, lon: -46.7585 },
  { id: "sp-metro-vila-das-belezas", name: "Estação Vila das Belezas", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6404, lon: -46.7459 },
  { id: "sp-metro-giovanni-gronchi", name: "Estação Giovanni Gronchi", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6441, lon: -46.7325 },
  { id: "sp-term-joao-dias", name: "Terminal João Dias", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.6438, lon: -46.7315 },
  { id: "sp-term-capelinha", name: "Terminal Capelinha", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.6577, lon: -46.7770 },
  { id: "sp-metro-santo-amaro", name: "Estação Santo Amaro", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada Metrô / Trem", line: "5-Lilás / 9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6558, lon: -46.7214 },
  { id: "sp-term-santo-amaro", name: "Terminal Santo Amaro", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.6545, lon: -46.7118 },
  { id: "sp-metro-largo-treze", name: "Estação Largo Treze", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6534, lon: -46.7082 },
  { id: "sp-metro-adolfo-pinheiro", name: "Estação Adolfo Pinheiro", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6501, lon: -46.7027 },
  { id: "sp-metro-alto-da-boa-vista", name: "Estação Alto da Boa Vista", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6416, lon: -46.6991 },
  { id: "sp-metro-borba-gato", name: "Estação Borba Gato", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6332, lon: -46.6928 },
  { id: "sp-metro-brooklin", name: "Estação Brooklin", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6264, lon: -46.6875 },
  { id: "sp-metro-campo-belo", name: "Estação Campo Belo", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás / 17-Ouro", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6198, lon: -46.6791 },
  { id: "sp-metro-eucaliptos", name: "Estação Eucaliptos", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6095, lon: -46.6685 },
  { id: "sp-metro-moema", name: "Estação Moema", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6041, lon: -46.6616 },
  { id: "sp-metro-aacd-servidor", name: "Estação AACD-Servidor", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5976, lon: -46.6524 },
  { id: "sp-metro-hospital-sao-paulo", name: "Estação Hospital São Paulo", transportType: "METRO", transportLabel: "Estação de Metrô", line: "5-Lilás", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5982, lon: -46.6455 },
  { id: "sp-metro-chacara-klabin", name: "Estação Chácara Klabin", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada Metrô", line: "2-Verde / 5-Lilás", operator: "Metrô-SP / ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5925, lon: -46.6303 },

  // Linha 4 - Amarela & Terminais Zona Oeste
  { id: "sp-metro-vila-sonia", name: "Estação Vila Sônia", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5921, lon: -46.7328 },
  { id: "sp-term-vila-sonia", name: "Terminal Vila Sônia", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans / EMTU", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.5918, lon: -46.7325 },
  { id: "sp-metro-sao-paulo-morumbi", name: "Estação São Paulo-Morumbi", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5864, lon: -46.7138 },
  { id: "sp-metro-butanta", name: "Estação Butantã", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5718, lon: -46.7082 },
  { id: "sp-term-butanta", name: "Terminal Butantã", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.5715, lon: -46.7080 },
  { id: "sp-metro-faria-lima", name: "Estação Faria Lima", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5672, lon: -46.6941 },
  { id: "sp-metro-fradique-coutinho", name: "Estação Fradique Coutinho", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5661, lon: -46.6841 },
  { id: "sp-metro-oscar-freire", name: "Estação Oscar Freire", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5601, lon: -46.6718 },
  { id: "sp-metro-higienopolis-mackenzie", name: "Estação Higienópolis-Mackenzie", transportType: "METRO", transportLabel: "Estação de Metrô", line: "4-Amarela", operator: "ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5489, lon: -46.6521 },
  { id: "sp-metro-republica", name: "Estação República", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada Metrô", line: "3-Vermelha / 4-Amarela", operator: "Metrô-SP / ViaQuatro", city: "São Paulo", state: "SP", lat: -23.5434, lon: -46.6425 },

  // Linha 9 - Esmeralda (Trem)
  { id: "sp-cptm-morumbi", name: "Estação Morumbi", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada CPTM / Metrô", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6212, lon: -46.7025 },
  { id: "sp-cptm-granja-julieta", name: "Estação Granja Julieta", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6335, lon: -46.7088 },
  { id: "sp-cptm-joao-dias", name: "Estação João Dias", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6428, lon: -46.7145 },
  { id: "sp-cptm-berrini", name: "Estação Berrini", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6068, lon: -46.6975 },
  { id: "sp-cptm-vila-olimpia", name: "Estação Vila Olímpia", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5932, lon: -46.6925 },
  { id: "sp-cptm-cidade-jardim", name: "Estação Cidade Jardim", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5832, lon: -46.6912 },
  { id: "sp-cptm-hebraica-reboucas", name: "Estação Hebraica-Rebouças", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5768, lon: -46.6978 },
  { id: "sp-cptm-cidade-universitaria", name: "Estação Cidade Universitária", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5558, lon: -46.7078 },
  { id: "sp-cptm-villa-lobos", name: "Estação Villa-Lobos-Jaguaré", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5462, lon: -46.7248 },
  { id: "sp-cptm-ceasa", name: "Estação Ceasa", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.5358, lon: -46.7398 },
  { id: "sp-cptm-socorro", name: "Estação Socorro", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6698, lon: -46.7112 },
  { id: "sp-cptm-jurubatuba", name: "Estação Jurubatuba", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação de Trem", line: "9-Esmeralda", operator: "ViaMobilidade", city: "São Paulo", state: "SP", lat: -23.6845, lon: -46.6978 },
  { id: "sp-cptm-grajau", name: "Terminal Intermodal Grajaú", transportType: "ESTACAO_INTEGRADA", transportLabel: "Terminal Intermodal Trem / Ônibus", line: "9-Esmeralda / SPTrans", operator: "ViaMobilidade / SPTrans", city: "São Paulo", state: "SP", lat: -23.7378, lon: -46.6942 },

  // Linha 3 - Vermelha & Zona Leste
  { id: "sp-metro-tatuape", name: "Estação Tatuapé", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada Metrô / CPTM", line: "3-Vermelha / 11 / 12", operator: "Metrô-SP / CPTM", city: "São Paulo", state: "SP", lat: -23.5401, lon: -46.5768 },
  { id: "sp-metro-carrao", name: "Estação Carrão-Assaí Atacadista", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5375, lon: -46.5638 },
  { id: "sp-metro-penha", name: "Estação Penha", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5332, lon: -46.5431 },
  { id: "sp-metro-vila-matilde", name: "Estação Vila Matilde", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5317, lon: -46.5311 },
  { id: "sp-metro-guilhermina-esperanca", name: "Estação Guilhermina-Esperança", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5291, lon: -46.5165 },
  { id: "sp-metro-patriarca", name: "Estação Patriarca-Vila Ré", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5312, lon: -46.5012 },
  { id: "sp-metro-artur-alvim", name: "Estação Artur Alvim", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5404, lon: -46.4842 },
  { id: "sp-metro-itaquera", name: "Terminal Intermodal Corinthians-Itaquera", transportType: "ESTACAO_INTEGRADA", transportLabel: "Terminal Intermodal Metrô / CPTM", line: "3-Vermelha / 11-Coral", operator: "Metrô-SP / CPTM", city: "São Paulo", state: "SP", lat: -23.5424, lon: -46.4712 },
  { id: "sp-metro-belem", name: "Estação Belém", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5428, lon: -46.5902 },
  { id: "sp-metro-bresser-mooca", name: "Estação Bresser-Mooca", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5458, lon: -46.6081 },
  { id: "sp-metro-bras", name: "Estação Brás", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada Metrô / CPTM", line: "3-Vermelha / 7 / 10 / 11 / 12", operator: "Metrô-SP / CPTM", city: "São Paulo", state: "SP", lat: -23.5478, lon: -46.6165 },
  { id: "sp-metro-anhangabau", name: "Estação Anhangabaú", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5481, lon: -46.6385 },
  { id: "sp-metro-santa-cecilia", name: "Estação Santa Cecília", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5398, lon: -46.6496 },
  { id: "sp-metro-marechal-deodoro", name: "Estação Marechal Deodoro", transportType: "METRO", transportLabel: "Estação de Metrô", line: "3-Vermelha", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5338, lon: -46.6558 },

  // Linha 2 - Verde
  { id: "sp-metro-vila-madalena", name: "Estação Vila Madalena", transportType: "METRO", transportLabel: "Estação de Metrô", line: "2-Verde", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5465, lon: -46.6908 },
  { id: "sp-metro-sumare", name: "Estação Sumaré", transportType: "METRO", transportLabel: "Estação de Metrô", line: "2-Verde", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5508, lon: -46.6785 },
  { id: "sp-metro-clinicas", name: "Estação Clínicas", transportType: "METRO", transportLabel: "Estação de Metrô", line: "2-Verde", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5542, lon: -46.6712 },
  { id: "sp-metro-santos-imigrantes", name: "Estação Santos-Imigrantes", transportType: "METRO", transportLabel: "Estação de Metrô", line: "2-Verde", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5958, lon: -46.6212 },
  { id: "sp-metro-alto-do-ipiranga", name: "Estação Alto do Ipiranga", transportType: "METRO", transportLabel: "Estação de Metrô", line: "2-Verde", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.6025, lon: -46.6128 },
  { id: "sp-metro-sacoma", name: "Terminal Intermodal Sacomã", transportType: "ESTACAO_INTEGRADA", transportLabel: "Terminal Intermodal Sacomã", line: "2-Verde / Expresso Tiradentes", operator: "Metrô-SP / SPTrans", city: "São Paulo", state: "SP", lat: -23.6038, lon: -46.6025 },
  { id: "sp-metro-tamanduatei", name: "Estação Tamanduateí", transportType: "ESTACAO_INTEGRADA", transportLabel: "Estação Integrada Metrô / CPTM", line: "2-Verde / 10-Turquesa", operator: "Metrô-SP / CPTM", city: "São Paulo", state: "SP", lat: -23.5928, lon: -46.5895 },
  { id: "sp-metro-vila-prudente", name: "Terminal Intermodal Vila Prudente", transportType: "ESTACAO_INTEGRADA", transportLabel: "Terminal Intermodal Vila Prudente", line: "2-Verde / 15-Prata", operator: "Metrô-SP / SPTrans", city: "São Paulo", state: "SP", lat: -23.5852, lon: -46.5828 },

  // Linha 1 - Azul (Norte / Centro)
  { id: "sp-metro-tucuruvi", name: "Estação Tucuruvi", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.4802, lon: -46.6035 },
  { id: "sp-metro-parada-inglesa", name: "Estação Parada Inglesa", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.4882, lon: -46.6085 },
  { id: "sp-metro-santana", name: "Terminal Santana", transportType: "ESTACAO_INTEGRADA", transportLabel: "Terminal Intermodal Santana", line: "1-Azul", operator: "Metrô-SP / SPTrans", city: "São Paulo", state: "SP", lat: -23.5028, lon: -46.6248 },
  { id: "sp-metro-carandiru", name: "Estação Carandiru", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5098, lon: -46.6252 },
  { id: "sp-metro-tiete", name: "Terminal Rodoviário e Metrô Portuguesa-Tietê", transportType: "ESTACAO_INTEGRADA", transportLabel: "Terminal Rodoviário e Metrô", line: "1-Azul", operator: "Metrô-SP / Socicam", city: "São Paulo", state: "SP", lat: -23.5162, lon: -46.6252 },
  { id: "sp-metro-armenia", name: "Estação Armênia", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5255, lon: -46.6292 },
  { id: "sp-metro-tiradentes", name: "Estação Tiradentes", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5312, lon: -46.6318 },
  { id: "sp-metro-sao-bento", name: "Estação São Bento", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5441, lon: -46.6341 },
  { id: "sp-metro-liberdade", name: "Estação Japão-Liberdade", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5552, lon: -46.6358 },
  { id: "sp-metro-sao-joaquim", name: "Estação São Joaquim", transportType: "METRO", transportLabel: "Estação de Metrô", line: "1-Azul", operator: "Metrô-SP", city: "São Paulo", state: "SP", lat: -23.5618, lon: -46.6388 },

  // Terminais Importantes
  { id: "sp-term-pq-dom-pedro", name: "Terminal Parque Dom Pedro II", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Central de Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.5458, lon: -46.6292 },
  { id: "sp-term-lapa", name: "Terminal Lapa", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.5195, lon: -46.7018 },
  { id: "sp-term-pirituba", name: "Terminal Pirituba", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans / 7-Rubi", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.4862, lon: -46.7235 },
  { id: "sp-term-pinheiros", name: "Terminal Pinheiros", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans / EMTU", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.5668, lon: -46.7022 },
  { id: "sp-term-princesa-isabel", name: "Terminal Princesa Isabel", transportType: "TERMINAL_ONIBUS", transportLabel: "Terminal Urbano / Ônibus", line: "SPTrans", operator: "SPTrans", city: "São Paulo", state: "SP", lat: -23.5352, lon: -46.6455 }
];

const tsPath = path.resolve(__dirname, "../modules/scale-generator/transit-stations.data.ts");
const content = fs.readFileSync(tsPath, "utf8");

// Check if already merged
if (!content.includes("sp-metro-campo-limpo")) {
  const insertMarker = "export const REGISTERED_TRANSIT_STATIONS: RegisteredTransitStation[] = [";
  const markerIdx = content.indexOf(insertMarker);
  if (markerIdx !== -1) {
    const afterMarker = markerIdx + insertMarker.length;
    const additionalStr = "\n" + additionalSP.map(s => {
      return `  {\n    id: "${s.id}",\n    name: "${s.name}",\n    transportType: "${s.transportType}",\n    transportLabel: "${s.transportLabel}",\n    line: "${s.line || ""}",\n    operator: "${s.operator || ""}",\n    city: "${s.city}",\n    state: "${s.state}",\n    lat: ${s.lat},\n    lon: ${s.lon},\n  },`;
    }).join("\n");

    const newContent = content.substring(0, afterMarker) + additionalStr + content.substring(afterMarker);
    fs.writeFileSync(tsPath, newContent, "utf8");
    console.log("Updated transit-stations.data.ts with 80 new stations!");

    const jsContent = newContent.substring(newContent.indexOf("export const REGISTERED_TRANSIT_STATIONS")).replace(": RegisteredTransitStation[]", "");
    fs.writeFileSync(path.resolve(__dirname, "../../../api/_data/registered-transit-stations.js"), jsContent, "utf8");
    fs.writeFileSync(path.resolve(__dirname, "../../../client/api/_data/registered-transit-stations.js"), jsContent, "utf8");
    console.log("Updated api/_data and client/api/_data registered-transit-stations.js!");
  }
} else {
  console.log("Already merged!");
}
