# Project Plan

Ultima atualizacao: 2026-05-11

## Contexto rapido

O projeto tem duas partes principais:

- `extension/`: extensao Chrome em Vite, React e TypeScript. Captura dados visiveis de um perfil do LinkedIn, chama o backend e permite exportar PDF.
- `backend/`: API Express que recebe nome, headline e experiencias capturadas, gera analise local e pode enriquecer o resultado via Groq quando configurado.
- `docs/`: pagina estatica da politica de privacidade para publicacao via GitHub Pages.

A frente atual esta concentrada em deixar a extensao pronta para reenvio/publicacao na Chrome Web Store, reduzindo riscos de rejeicao por permissoes, remote hosted code e divulgacao insuficiente de privacidade.

## Estado atual das mudancas

- Manifestos da extensao separados para desenvolvimento e loja:
  - `manifest.dev.json` permite `localhost`.
  - `manifest.store.json` remove `activeTab` e `scripting`, declara CSP MV3 explicita e usa content script empacotado.
- Fluxo de build de loja endurecido:
  - `npm run build:store` aplica o manifesto de loja.
  - `prepare-store-dist.mjs` remove manifestos extras do `dist/`.
  - `audit-store-bundle.mjs` bloqueia `localhost`, scripts remotos, `eval`, CDNs comuns e permissoes indevidas.
- Captura de perfil melhorada:
  - ignora contexto social do LinkedIn como `e mais 1.078 pessoas` e `mutual connections`.
  - remove caracteres invisiveis/de controle antes de analisar texto.
  - captura ate 10 experiencias.
  - captura experiencias em containers modernos do LinkedIn e cargos agrupados.
  - usa o conteudo completo de `Sobre` como headline quando nao ha headline dedicada confiavel.
- PDF melhorado:
  - gerador nativo usa WinAnsiEncoding e fallback ASCII para caracteres fora do suporte basico.
  - headline, resumo e experiencias aceitam textos maiores.
  - PDF inclui todas as experiencias capturadas, nao apenas quatro.
- UI e documentacao:
  - popup informa que dados so sao enviados apos clique em `Analisar perfil`.
  - README, politica de privacidade e pagina HTML explicam backend, Groq, Render e ausencia de codigo remoto executado na maquina do usuario.
  - `extension/STORE_REVIEW_CHECKLIST.md` documenta o checklist de submissao e texto curto para contestacao/reenvio.

## Validacao ja executada

- `cd extension && rtk npm run lint`: passou.
- `cd extension && rtk npm test`: passou com 62 testes.
  - Statements: 98.32%
  - Branches: 91.69%
  - Functions: 98.11%
  - Lines: 98.25%
- `cd extension && rtk npm run build:store`: passou.
  - Vite build concluiu.
  - `prepare:store` removeu `manifest.dev.json` e `manifest.store.json` do `dist/`.
  - `audit:store` terminou com `Chrome Web Store audit passed.`

Validacao repetida antes do commit em 2026-05-11:

- `cd extension && rtk npm run build:store`: passou novamente.
- O bundle final ficou pronto em `extension/dist/` para teste manual local.

## Proximas tarefas

1. Fazer teste manual da extensao carregando `extension/dist/` no Chrome e analisando um perfil real do LinkedIn.
2. Confirmar que a URL publica da politica de privacidade esta acessivel:
   - `https://kleitonalbuquerque.github.io/linkedin-analyzer/privacy-policy/`
3. Gerar o zip de submissao contendo o conteudo de `extension/dist/` na raiz do zip.
4. Depois do upload/reenvio, acompanhar feedback da Chrome Web Store e ajustar texto/listagem se houver nova observacao.

## Observacoes para retomada

- Use `rtk` como prefixo para comandos de shell neste repo.
- Evite reverter mudancas existentes sem confirmar; a worktree ja estava com varias alteracoes abertas.
- O backend nao foi alterado nesta rodada, entao os testes do backend ficaram fora da validacao atual.
- `.codex` e `packages.microsoft.gpg` ficaram fora do commit por nao fazerem parte da frente atual.
- Sempre atualizar este arquivo quando uma tarefa mudar de estado, uma decisao for tomada ou uma nova pendencia aparecer.
