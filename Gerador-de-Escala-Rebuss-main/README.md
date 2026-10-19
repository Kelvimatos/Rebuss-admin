# REBUSS Gerador de Escalas

[REBUSS Gerador de Escalas](file:///C:/Users/rebuss/Desktop/DEV%20CLUB/geradordeEscala/img/geradordeescala.png)


## Visão Geral do Projeto

O REBUSS Gerador de Escalas é uma aplicação web desenvolvida para otimizar e automatizar o processo de geração de mensagens de escala de trabalho para a empresa REBUSS. O principal objetivo é reduzir o tempo gasto na criação e comunicação das escalas, minimizando erros humanos e padronizando o formato das mensagens.

A ferramenta integra funcionalidades de geolocalização para identificar o transporte público mais próximo ao endereço da escala, oferecendo uma solução completa para a logística diária dos colaboradores.

## Funcionalidades

-   **Geração de Escalas Personalizadas**: Crie mensagens de escala detalhadas com data, horário, loja, endereço e observações.
-   **Assinatura Dinâmica**: A mensagem é finalizada com o nome do usuário que a gerou (ex: `_Francisco – Rebuss_`), personalizando a comunicação.
-   **Geolocalização Inteligente**:
    -   Integração com **Nominatim (OpenStreetMap)** para geocodificação de endereços.
    -   Utiliza **Overpass API** para encontrar a estação de metrô ou terminal de ônibus mais próximo em um raio de 30km do endereço fornecido.
    -   Exibe informações como tipo de estação (ônibus/metrô), nome, linha (se aplicável) e distância.
    -   Suporte a linhas de transporte específicas para cidades como São Paulo, Rio de Janeiro, Belo Horizonte, Brasília e Goiânia.
-   **Histórico Local**: Armazena as escalas geradas localmente no navegador (LocalStorage), permitindo visualizar, copiar ou excluir entradas anteriores.
-   **Preenchimento Automático**: Campos de data e horário são preenchidos automaticamente com o momento atual para agilizar o processo.
-   **Compartilhamento Nativo**: Em dispositivos móveis, o botão "Copiar" tenta usar a Web Share API para compartilhamento direto em aplicativos como WhatsApp.
-   **Interface Intuitiva (Mobile-First)**: Design responsivo e moderno, otimizado para uso em dispositivos móveis, com elementos visuais como Glassmorphism e variáveis CSS.

## Tecnologias Utilizadas

-   **Frontend**:
    -   HTML5
    -   CSS3 (com variáveis CSS, `backdrop-filter`)
    -   JavaScript (Vanilla JS)
-   **APIs Externas**:
    -   Nominatim (OpenStreetMap): Para geocodificação de endereços.
    -   Overpass API: Para consulta de dados de transporte público (estações, terminais).
-   **Armazenamento Local**:
    -   Web Storage API (LocalStorage): Para persistência do histórico e nome do usuário.
-   **Outras APIs Web**:
    -   Web Share API: Para compartilhamento nativo em dispositivos móveis.

## Como Usar

1.  **Acesse a Aplicação**: Abra o arquivo `index.html` em seu navegador.
2.  **Selecione a Cidade**: Escolha a cidade relevante para a escala.
3.  **Preencha os Dados**:
    -   **Seu Nome**: Digite seu nome (será usado na assinatura da mensagem). O aplicativo lembrará seu nome para futuras escalas.
    -   **Data e Horário**: Preenchidos automaticamente, mas podem ser ajustados.
    -   **Loja**: Nome da loja ou local de trabalho.
    -   **Endereço**: Endereço completo da escala. Ao digitar, o sistema buscará automaticamente a estação/terminal mais próximo.
    -   **Observações**: Qualquer informação adicional (opcional).
4.  **Incluir Estação/Terminal**: Use o toggle para decidir se a informação da estação/terminal deve ser incluída na mensagem.
5.  **Gerar Mensagem**: Clique em "⚡ Gerar Mensagem". A prévia aparecerá abaixo.
6.  **Copiar/Compartilhar**: Clique em "Copiar" para copiar a mensagem para a área de transferência ou, em dispositivos móveis, para abrir as opções de compartilhamento nativo.
7.  **Histórico**: As escalas geradas são salvas no histórico. Você pode visualizá-las, copiá-las novamente ou excluí-las.

## Estrutura do Projeto

```
geradordeEscala/
├── index.html          # Estrutura principal da aplicação
├── style.css           # Estilos CSS da interface
├── script.js           # Lógica JavaScript principal da aplicação
└── img/                # Pasta para imagens
    └── favicon.png     # Ícone do site
```

## Instalação e Execução

Para rodar este projeto localmente:

1.  **Clone o repositório** (se estiver em um):
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd geradordeEscala
    ```
2.  **Abra o arquivo `index.html`** em seu navegador web preferido.
    ```bash
    # No Windows
    start index.html
    # No macOS
    open index.html
    ```

## Contribuição

Sinta-se à vontade para sugerir melhorias ou reportar bugs.

## Licença

Este projeto está licenciado sob a licença MIT.
```

---

