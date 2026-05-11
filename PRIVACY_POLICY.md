# Política de Privacidade do LinkedIn Analyzer

## 1. Escopo

O LinkedIn Analyzer é uma extensão de navegador que analisa dados visíveis de perfis do LinkedIn para gerar um diagnóstico do perfil profissional, incluindo score, pontos fortes, pontos fracos, problemas identificados e sugestões de melhoria.

## 2. Dados coletados

Quando o usuário solicita uma análise, a extensão coleta apenas dados visíveis na página do perfil do LinkedIn aberta naquele momento. Esses dados podem incluir:

- nome do perfil
- headline
- experiências exibidas na página

A extensão não coleta mensagens privadas, credenciais, senhas, informações financeiras, histórico de navegação fora da página analisada ou qualquer informação não visível do perfil.

## 3. Como os dados são usados

Os dados coletados são enviados ao backend do LinkedIn Analyzer exclusivamente para processar a análise solicitada pelo usuário. O resultado retornado pode incluir classificação do perfil, benchmark, resumo e sugestões de melhoria, e pode ser exportado pelo usuário em PDF.

O backend pode processar esses dados de duas formas:

- análise local baseada em regras executada no próprio servidor do projeto
- análise com modelo de linguagem da Groq quando esse provedor estiver habilitado na infraestrutura do backend

Em ambos os casos, a extensão não baixa nem executa código remoto na máquina do usuário. O backend retorna apenas dados estruturados para exibição do resultado.

## 4. Compartilhamento de dados

Os dados analisados não são vendidos nem compartilhados com terceiros para publicidade, perfilização comercial ou qualquer finalidade não relacionada ao funcionamento da extensão.

Quando a análise com LLM estiver habilitada, o texto enviado para análise poderá ser processado pela infraestrutura da Groq para geração do resultado. A hospedagem do backend pode utilizar infraestrutura em nuvem compatível com a operação do serviço, como Render.

## 5. Armazenamento e retenção

Os dados são utilizados para gerar a resposta da análise e não são gravados em banco de dados próprio pela extensão. Se houver retenção técnica temporária em logs de aplicação, provedor de hospedagem ou provedor de inferência, ela deve ser limitada ao mínimo necessário para operação, segurança e diagnóstico do serviço.

## 6. Segurança

O LinkedIn Analyzer adota medidas técnicas razoáveis para proteger os dados transmitidos entre a extensão e o backend.

## 7. Controle do usuário

O usuário escolhe quando executar a análise. Sem essa ação explícita, a extensão não inicia o envio dos dados do perfil para o backend.

## 8. Contato

Para dúvidas sobre privacidade ou tratamento de dados, abra uma solicitação em:

- https://github.com/kleitonalbuquerque/linkedin-analyzer/issues
