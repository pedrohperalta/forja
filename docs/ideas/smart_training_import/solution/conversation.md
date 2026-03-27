# Solution Design Conversation — Smart Training Import

## Q1: Backend para processamento de imagem
**Pergunta:** Para o serviço de processamento de imagem (IA que extrai exercícios da foto), qual abordagem de API você prefere?
**Resposta:** Após análise comparativa de custos e pros/cons (Claude API direto, Cloud Function, Supabase Edge, Convex, Expo API Routes), escolheu **Supabase Edge Function** — API key segura, free tier generoso, base para futuro sync/web.

## Q2: Modelo de dados — substituição de plano
**Pergunta:** Ao importar um novo programa, como deve funcionar a substituição em relação ao planStore?
**Resposta:** **Soft delete (flag archived)** — planos antigos ganham `archived: true` e somem da UI principal, mas ficam no MMKV. Migração v2 do planStore.

## Q3: Navegação — entry points
**Pergunta:** Onde o usuário inicia a importação? Quais novas rotas são necessárias?
**Resposta:** **Entry point múltiplo** — acessível da Home (quando sem planos, via EmptyPlans) e da tela de Planos (botão secundário). Rotas: `/plans/import`, `/plans/import/processing`, `/plans/import/review`.

## Q4: Captura de imagens — escopo v1
**Pergunta:** Foto + galeria apenas, ou incluir PDF?
**Resposta:** **Foto + Galeria apenas** — expo-image-picker já está no projeto. PDF fica para v2.

## Q5: Rollout e feature flag
**Pergunta:** Como controlar o lançamento da feature?
**Resposta:** **Sem feature flag** — app pessoal, sem necessidade de gradual rollout.
