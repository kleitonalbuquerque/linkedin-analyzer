# LinkedIn Analyzer

O LinkedIn Analyzer é um projeto composto por uma extensão de navegador e uma API backend para analisar perfis do LinkedIn e sugerir melhorias de apresentacao profissional.

## Finalidade do projeto

O objetivo principal e ajudar o usuario a entender como o perfil do LinkedIn esta sendo apresentado e identificar pontos de melhoria, como:

- qualidade do headline
- nivel de detalhamento das experiencias
- presenca de palavras-chave relevantes
- oportunidades para destacar melhor habilidades e projetos

## Como o projeto funciona

O projeto e dividido em duas partes:

### 1. Extensao Chrome

A extensao e responsavel por:

- detectar quando o usuario esta em uma pagina de perfil do LinkedIn
- capturar dados visiveis do perfil, como nome, headline e experiencias
- enviar essas informacoes para analise
- exibir no popup uma pontuacao e sugestoes de melhoria

### 2. Backend

O backend recebe os dados enviados pela extensao e executa a logica de analise.

Na versao atual, a analise ainda segue uma abordagem simples baseada em regras, mas a estrutura do projeto permite evoluir para uma analise mais avancada no futuro.

## Fluxo geral

1. O usuario abre um perfil no LinkedIn.
2. A extensao captura os dados da pagina.
3. O popup envia esses dados para o backend.
4. O backend calcula uma pontuacao e monta sugestoes.
5. A extensao mostra o resultado para o usuario.

## Estrutura do repositorio

- `backend/`: API responsavel pela analise dos dados do perfil
- `extension/`: extensao do Chrome responsavel pela captura e exibicao do resultado

## Resultado esperado

Ao final do fluxo, o usuario recebe um retorno simples e direto sobre o perfil analisado, com foco em melhorar clareza, relevancia e impacto profissional no LinkedIn.