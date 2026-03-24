# LinkedIn Analyzer Extension

Esta pasta contem a extensao Chrome do projeto LinkedIn Analyzer.

## Modos de manifesto

Existem duas variantes de manifesto em `public/`:

- `manifest.dev.json`: usada para desenvolvimento local, com permissao para `http://localhost:3000/*`
- `manifest.store.json`: usada para publicacao, com permissoes apenas para LinkedIn e Render

O arquivo `public/manifest.json` e sincronizado automaticamente pelos scripts do pacote antes de iniciar o Vite ou gerar build.

## Scripts

- `npm run dev`: aplica o manifesto de desenvolvimento e inicia o Vite em modo development
- `npm run build:dev`: gera um build de desenvolvimento com backend local
- `npm run build:store`: gera um build pronto para Chrome Web Store
- `npm run manifest:dev`: copia `manifest.dev.json` para `manifest.json`
- `npm run manifest:store`: copia `manifest.store.json` para `manifest.json`

## Configuracao de backend

- `.env.development`: usa `http://localhost:3000`
- `.env.production`: usa `https://linkedin-analyzer-backend-2v7h.onrender.com`

Os builds usam o modo correspondente do Vite para resolver a URL da API sem depender de edicao manual antes da publicacao.
