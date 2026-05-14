# LinkedIn Analyzer Extension

Esta pasta contem a extensao Chrome do projeto LinkedIn Analyzer.

## Modos de manifesto

Existem duas variantes de manifesto em `public/`:

- `manifest.dev.json`: usada para desenvolvimento local, com permissao para `http://localhost:3000/*`
- `manifest.store.json`: usada para publicacao, sem `activeTab` ou `scripting` e com CSP explicita para MV3

O arquivo `public/manifest.json` e sincronizado automaticamente pelos scripts do pacote antes de iniciar o Vite ou gerar build.

## Scripts

- `npm run dev`: aplica o manifesto de desenvolvimento e inicia o Vite em modo development
- `npm run build:dev`: gera um build de desenvolvimento com backend local
- `npm run build:store`: gera um build pronto para Chrome Web Store
- `npm run test`: executa os testes unitarios com coverage minimo de 90%
- `npm run test:watch`: executa os testes em modo watch
- `npm run assets:store`: gera screenshots e blocos promocionais em `store-assets/`
- `npm run manifest:dev`: copia `manifest.dev.json` para `manifest.json`
- `npm run manifest:store`: copia `manifest.store.json` para `manifest.json`
- `npm run prepare:store`: remove artefatos de desenvolvimento do `dist/` antes da submissao
- `npm run audit:store`: valida o bundle final contra padroes que costumam causar rejeicao na Chrome Web Store

## Testes do frontend

Os testes do popup usam:

- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/user-event`

Para rodar localmente:

- `npm test`

O comando valida os fluxos principais do popup, a integracao com `chrome.tabs`, a chamada ao backend e a exportacao do PDF. A cobertura minima configurada e de 90% para statements, branches, functions e lines.

## Configuracao de backend

- `.env.development`: usa `http://localhost:3000`
- `.env.production`: usa `https://linkedin-analyzer-backend-2v7h.onrender.com`

Os builds usam o modo correspondente do Vite para resolver a URL da API sem depender de edicao manual antes da publicacao.

## Assets da Chrome Web Store

O comando `npm run assets:store` gera automaticamente as pecas de publicacao em `store-assets/`:

- `screenshot-01-overview.png`
- `screenshot-02-score.png`
- `screenshot-03-insights.png`
- `screenshot-04-pdf.png`
- `screenshot-05-privacy.png`
- `promo-small-440x280.png`
- `promo-marquee-1400x560.png`

O script tambem salva a versao SVG de cada arte para facilitar ajustes posteriores.
Para gerar uma variacao sem substituir os arquivos atuais, use `npm run assets:store -- --suffix v2`.

## Empacotar o build para upload

Para gerar o zip de publicacao por linha de comando no Windows:

1. execute `npm run build:store`
2. confirme que o build terminou com a auditoria `audit:store`
3. execute `powershell -Command "Compress-Archive -Path '.\\dist\\*' -DestinationPath '.\\linkedin-analyzer-extension.zip' -Force"`

O arquivo final sera criado em `extension/linkedin-analyzer-extension.zip` e sera sobrescrito localmente a cada novo empacotamento.

Esse comando compacta os arquivos dentro de `dist/`, nao a pasta `dist/` em si. Isso garante que `manifest.json` fique na raiz do zip, como esperado pela Chrome Web Store.

O pacote de loja gerado agora remove automaticamente `manifest.dev.json` e `manifest.store.json` do `dist/`. O zip final deve conter apenas os arquivos necessarios para execucao da extensao publicada.

O zip nao deve ser versionado no git. Gere-o novamente apenas quando precisar subir uma nova versao.
