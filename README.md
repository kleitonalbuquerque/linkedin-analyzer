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
- enviar essas informacoes para analise apenas quando o usuario clica em `Analisar perfil`
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

O repositorio agora inclui configuracoes por ambiente para a extensao:

- `extension/.env.development` aponta para `http://localhost:3000`
- `extension/.env.production` aponta para `https://linkedin-analyzer-backend-2v7h.onrender.com`
- `extension/public/manifest.dev.json` inclui permissao de `localhost`
- `extension/public/manifest.store.json` mantem apenas LinkedIn e Render para publicacao, sem injecao dinamica de scripts

Com isso, o fluxo recomendado passa a ser:

- `npm run dev` em `extension/` para trabalhar com backend local
- `npm run build:dev` em `extension/` para gerar um pacote de desenvolvimento
- `npm run build:store` em `extension/` para gerar o pacote pronto para Chrome Web Store
- o build de loja executa uma auditoria automatica para bloquear `localhost`, manifestos extras e padroes proibidos no bundle final

### Gerar o zip da extensao por linha de comando

Para empacotar a versao pronta para publicacao na Chrome Web Store pelo terminal no Windows:

1. execute `cd extension`
2. execute `npm run build:store`
3. execute `powershell -Command "Compress-Archive -Path '.\\dist\\*' -DestinationPath '.\\linkedin-analyzer-extension.zip' -Force"`

O arquivo final sera gerado em `extension/linkedin-analyzer-extension.zip` e sempre sera sobrescrito localmente pelo comando acima.

Importante: o comando compacta o conteudo de `dist/` na raiz do zip. Isso e necessario para que `manifest.json`, `assets/`, `content/` e `icons/` fiquem no nivel correto para upload. Nao compacte a pasta `dist/` inteira como diretório de primeiro nivel.

Esse zip e apenas um artefato local de release e nao deve ser versionado no repositório.

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
- `PRIVACY_POLICY.md`: politica de privacidade versionada para publicacao em URL publica
- `docs/`: arquivos estaticos para publicar a politica de privacidade no GitHub Pages

## Conformidade Chrome Web Store

O fluxo de loja foi endurecido para facilitar a revisao da Chrome Web Store:

- o pacote publicado nao depende de `activeTab` nem `scripting`
- o `content_script` e empacotado localmente no build e nao e injetado a partir de codigo remoto
- o popup deixa explicito que o envio de dados so acontece apos clique do usuario
- a auditoria de `build:store` falha se encontrar artefatos extras ou padroes associados a remote hosted code

## Testes e coverage

### Backend

- execute `cd backend && npm test`
- o comando roda os testes unitarios com Vitest e gera o relatorio de coverage no terminal
- a configuracao valida cobertura minima de `90%` para `statements`, `branches`, `functions` e `lines`
- a ultima validacao desta base ficou em `97.60%` de statements, `91.42%` de branches, `100%` de functions e `97.58%` de lines

### Frontend

- execute `cd extension && npm test`
- o comando roda os testes unitarios do popup com Vitest, jsdom e React Testing Library e gera o relatorio de coverage no terminal
- a configuracao do frontend tambem exige cobertura minima de `90%` em `statements`, `branches`, `functions` e `lines`
- a ultima validacao desta base ficou em `100%` de statements, `93.47%` de branches, `100%` de functions e `100%` de lines

### Execucao durante desenvolvimento

- `cd backend && npm run test:watch`
- `cd extension && npm run test:watch`

Quando algum threshold ficar abaixo de `90%`, o comando de teste falha e mostra no terminal qual metrica precisa ser ajustada.

## Publicar politica no GitHub Pages

O repositorio agora inclui uma pagina HTML pronta em `docs/privacy-policy/index.html`.

Para publicar:

1. envie o repositorio atualizado para o GitHub
2. abra `Settings > Pages`
3. em `Build and deployment`, selecione `GitHub Actions`
4. aguarde a execucao do workflow `Deploy GitHub Pages`

Se o repositorio ainda estiver configurado como `Deploy from a branch`, troque para `GitHub Actions` para evitar o 404 da pasta `docs` nao publicada.

Se o repositorio continuar em `kleitonalbuquerque/linkedin-analyzer`, a URL esperada sera:

- `https://kleitonalbuquerque.github.io/linkedin-analyzer/privacy-policy/`

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
