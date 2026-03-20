# Discovery Conversation — Forja

## Q1: Qual problema o Forja resolve?
**Resposta:** Combinação de dois problemas:
1. Não registra treinos — vai à academia sem anotar pesos/séries, impossível medir progresso
2. Caderno / app de notas é desorganizado — lento, sem estrutura, difícil consultar histórico

## Q2: Quais seus objetivos fitness com o plano de hipertrofia?
**Resposta (múltipla):**
- Ganhar massa muscular / estética
- Sobrecarga progressiva — aumentar cargas semana a semana com base em dados

## Q3: Há quanto tempo treina no Espaço Prime?
**Resposta:** Poucas semanas. O plano ABC foi dado pelo instrutor da academia.

## Q4: O que deseja para o futuro além do escopo atual?
**Resposta (múltipla):**
- Gráficos de progresso / histórico (ver tendência de peso por exercício)
- Editor de plano (mudar exercícios, criar novos treinos)

## Q5: Descanso entre séries ou entre exercícios?
**Resposta:** Após cada série (3 descansos por exercício). Fluxo: Série 1 → Descanso → Série 2 → Descanso → Série 3 → Descanso → Próximo exercício.

## Q6: Timer SVG — react-native-svg ou abordagem com View?
**Resposta:** react-native-svg (recomendado). Arco circular idêntico ao mockup.

## Q7 (v5): Quando o botão de pular deve estar disponível?
**Resposta:** Só deveria ser possível pular um exercício antes de começar a primeira série. Uma vez feita a primeira série, não faz sentido poder pular. Tanto "Pular — aparelho ocupado" quanto "Não vou fazer hoje" seguem essa regra.

## Q8 (v6): Como funciona o apagar/desfazer treino?
**Resposta:** A funcionalidade de "desfazer último treino" (long-press na home) era confusa porque o usuário pode ter múltiplos treinos anteriores. Substituída por uma tela de **Histórico** acessível via card na home — lista todos os treinos passados com data, duração e exercícios, e permite apagar qualquer registro individualmente.

## Q9 (v8): Ajustes visuais e bug de checkpoint
**Resposta (3 itens):**
1. **Bug — checkpoint não aparece ao pular exercícios:** Quando o usuário pulava exercícios e completava o último exercício não-pulado, a tela de revisão de pendentes (checkpoint) não aparecia. Corrigido: agora verifica se todos os exercícios restantes na fila são pulados e mostra o checkpoint automaticamente.
2. **Fontes muito pequenas:** Todas as fontes de ambos os arquivos (PRD e mockup) foram aumentadas em ~2px para melhor legibilidade.
3. **Aspect ratio dos mockups da PRD:** Os telefones mockup da PRD estavam muito quadrados (usavam `min-height: 500px`). Corrigido para `aspect-ratio: 390/844`, igualando as proporções do mockup.html interativo.
