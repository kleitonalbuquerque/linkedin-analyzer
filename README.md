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
4. O backend calcula um score baseado em benchmark de mercado e tenta gerar sugestoes com LLM.
5. A extensao mostra o resultado para o usuario e permite exportar um PDF da analise.

## LLM free

O backend agora suporta uso do Groq para gerar uma analise mais rica do perfil com nivel, foco, pontos fortes, pontos fracos, problemas e sugestoes.

- configure `GROQ_API_KEY` no ambiente do backend
- opcionalmente configure `GROQ_MODEL` para trocar o modelo, mantendo por padrao `openai/gpt-oss-120b`
- se a chave nao estiver configurada ou a chamada falhar, o sistema usa automaticamente uma analise local com fallback

Para desenvolvimento local, crie `backend/.env` com base em `backend/.env.example`.

Depois que o backend for hospedado, configure `GROQ_API_KEY` e `GROQ_MODEL` no painel de variaveis de ambiente da plataforma escolhida. Nao coloque a chave real no codigo, no README ou em arquivos versionados.

Na extensao, a URL da API pode ser definida com `VITE_API_BASE_URL`. Sem isso, o popup usa `http://localhost:3000` por padrao.

Para desenvolvimento local da extensao, crie `extension/.env` com base em `extension/.env.example`.

Um exemplo de configuracao pode ser criado a partir de `backend/.env.example`.

## PDF de analise

Depois de analisar o perfil, a extensao libera o botao `Exportar PDF`.

O arquivo gerado inclui:

- nome e headline do perfil capturado
- score de mercado
- nivel estimado
- foco principal
- benchmark resumido
- resumo da analise
- pontos fortes
- pontos fracos
- problemas identificados
- lista de sugestoes prioritarias

## Estrutura do repositorio

- `backend/`: API responsavel pela analise dos dados do perfil
- `extension/`: extensao do Chrome responsavel pela captura e exibicao do resultado

## Deploy do backend no Render

Configuracao recomendada do servico:

- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/health`
- Blueprint opcional: `render.yaml` na raiz do repositorio

Variaveis de ambiente recomendadas no Render:

- `GROQ_API_KEY`
- `GROQ_MODEL=openai/gpt-oss-120b`
- `ALLOWED_ORIGINS=https://www.linkedin.com`

## Resultado esperado

Ao final do fluxo, o usuario recebe um retorno simples e direto sobre o perfil analisado, com foco em melhorar clareza, relevancia e impacto profissional no LinkedIn.
