# Chrome Web Store Submission Checklist

## Antes do upload

- Execute `npm run build:store` em `extension/`
- Confirme que o comando terminou com `Chrome Web Store audit passed.`
- Verifique que `extension/dist/` contem apenas `manifest.json`, popup final, `content/script.js`, icones e assets necessarios
- Gere o zip contendo o conteudo de `dist/`, nao a pasta `dist/`
- Confirme que a URL publica da politica de privacidade esta acessivel
- Revise a descricao da listagem para afirmar que o envio de dados ocorre apenas apos clique do usuario

## Declaracoes para a listagem

- A extensao analisa apenas o perfil aberto no LinkedIn
- O envio de dados acontece somente quando o usuario clica em `Analisar perfil`
- Os dados enviados sao nome, headline e experiencias visiveis do perfil aberto
- A extensao nao baixa nem executa codigo remoto na maquina do usuario

## Texto curto para contestacao ou reenvio

The submitted MV3 package has been updated to remove dynamic script injection and unnecessary permissions. All executable extension logic is packaged locally in the submission bundle, and the remote backend is used only to process user-requested profile data and return structured analysis results. The store build now strips non-runtime manifest variants and runs an automated audit to block localhost references, remote script tags, eval-like patterns, and other common remote hosted code signals.
