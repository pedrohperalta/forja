# Discovery Conversation — Smart Training Import

## Q1: O que motiva a mudança de treino?
**Pergunta:** Quando você diz que o treino muda ao longo do tempo, o que geralmente provoca a mudança?
**Resposta:** O treinador envia um novo programa.

## Q2: Em que formato o treinador envia o programa?
**Pergunta:** Como o treinador entrega o novo programa? Em que formato chega?
**Resposta:** PDF ou imagem.

## Q3: Qual o tamanho típico de um programa?
**Pergunta:** Como é um programa típico do seu treinador? Quantos planos e exercícios por plano?
**Resposta:** 2-3 treinos (A, B, C), 5-7 exercícios cada. Cada treino tem sua própria foto.

## Q4: Como é a troca de programa?
**Pergunta:** Quando o treinador envia um novo programa, você substitui tudo de uma vez ou atualiza aos poucos?
**Resposta:** Substitui tudo de uma vez.

## Q5: Qual a parte mais dolorosa do input manual?
**Pergunta:** Qual é a parte mais dolorosa do cadastro atual? Onde gasta mais tempo ou comete mais erros?
**Resposta:** Principalmente digitar nomes de exercícios (erros, lembrar nomes exatos) e preencher todos os detalhes (séries, reps, descanso, equipamento) para cada exercício.

## Q6: Qual abordagem de solução prefere?
**Pergunta:** Qual abordagem prefere: scan via IA, catálogo, texto estruturado ou combinação?
**Resposta:** A imagem deve ser enviada para uma API que processa e retorna o treino completo com todas as informações. Sem catálogo local.

## Feedback na revisão (v1 → v2)
- Remover catálogo de exercícios local — a API deve retornar tudo
- PRD muito técnico — manter a nível de produto/negócio, sem detalhes de implementação

## Feedback na revisão (v2 → v3)
- Um plano pode ter vários treinos (A, B, C). Cada treino possui uma foto separada.
- Fluxo de captura atualizado: uma foto por treino, processamento individual de cada um.
