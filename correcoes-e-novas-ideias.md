# FinControl AO — Correções Aplicadas e Novas Ideias

> Este documento acompanha o ficheiro `correcoes-backend-fincontrol.zip`, que contém todos os ficheiros do backend já corrigidos. Copia-os para o teu repositório, mantendo a mesma estrutura de pastas dentro de `controle-custos-backend/src/`. Todas as alterações foram validadas com `tsc --noEmit` (compila sem erros) e com a suite de testes existente (`npx jest`, 14/14 a passar).

---

## 1. Correções Críticas

### 1.1 Bot de WhatsApp já não cria uma conta desligada da conta do site

**Problema:** uma mensagem de WhatsApp criava sempre um `Usuario` novo com `googleId: whatsapp_<telefone>`, sem qualquer ligação a uma conta já existente feita via Google no site.

**Correção:**
- Novo endpoint autenticado `POST /usuarios/whatsapp/gerar-codigo` — o utilizador, já logado no site, pede um código de 6 dígitos válido por 10 minutos.
- O utilizador envia `"vincular 123456"` ao bot do WhatsApp.
- `UsuariosService.vincularWhatsappPorCodigo()` localiza a conta dona do código (ainda válido) e associa o número de telefone a ela — inclusive libertando o número de uma eventual conta "só WhatsApp" anterior, para não violar a restrição de unicidade.
- Se alguém escrever ao bot sem nunca ter vinculado, o sistema continua a criar uma conta leve "só WhatsApp" (para quem começa a usar o produto assim), mas **agora avisa explicitamente** na primeira resposta: *"Já tem conta no site? Vá a Definições > Vincular WhatsApp..."*.

**Ficheiros alterados:** `usuarios/usuario.entity.ts`, `usuarios/usuarios.service.ts`, `usuarios/usuarios.controller.ts` (novo), `usuarios/usuarios.module.ts`, `whatsapp/whatsapp-bot.service.ts`.

**Ainda por fazer no frontend:** um ecrã em "Definições" que chama o novo endpoint e mostra o código com instrução clara + temporizador de 10 minutos.

---

### 1.2 Login "convidado" deixou de ser uma conta partilhada por todos

**Problema:** `guestLogin()` usava sempre o mesmo `googleId: 'guest_demo_user'` — todos os visitantes em modo convidado viam e editavam os mesmos dados uns dos outros.

**Correção:** cada chamada gera agora um `googleId` único (`guest_<uuid>`), criando uma conta efémera isolada por sessão.

**Ficheiro alterado:** `auth/auth.service.ts`.

**Sugestão futura:** criar uma tarefa agendada (cron job) que apaga contas com `googleId` a começar por `guest_` e sem atividade há mais de, por exemplo, 30 dias — para não acumular lixo na base de dados.

---

## 2. Correções de Regras de Negócio

### 2.1 Projeção de rendimento variável agora é por fonte, com janela de 3 meses

**Problema:** a projeção somava **todas** as receitas do utilizador, de qualquer fonte, sem limite de tempo — misturando salário fixo com biscate variável na mesma média.

**Correção:**
- Novo campo `fonteRendimentoId` em `Transacao`, ligando cada receita à fonte que a gerou.
- Novo método `TransacoesService.findReceitasPorFonte(usuarioId, fonteId, meses)`, que filtra por fonte específica e por janela de tempo.
- `FontesRendimentoService.calcularProjecaoRendimentos` agora calcula a média móvel real de 3 meses **por fonte**, e devolve `0` (em vez de um valor arbitrário como 50.000) quando não há histórico ainda — para não fingir uma precisão que não existe.

**Ficheiros alterados:** `transacoes/transacao.entity.ts`, `transacoes/dto/create-transacao.dto.ts`, `transacoes/transacoes.service.ts`, `fontes-rendimento/fontes-rendimento.service.ts`.

**Ação necessária:** o frontend precisa de passar `fonteRendimentoId` ao criar uma transação de receita, para que a ligação funcione. Vale a pena adicionar um seletor de "fonte de rendimento" no formulário de lançamento de receita.

---

### 2.2 Motor de projeção de fluxo de caixa corrigido em três pontos

**Problemas e correções:**
1. **Moedas misturadas:** somava saldos de contas em moedas diferentes como se fossem a mesma unidade → agora converte cada saldo para a `moedaReferencia` do utilizador via `CambioService.converter()` antes de somar.
2. **Base de despesa só do mês atual:** se o mês estivesse a começar, a projeção parecia otimista demais → agora usa `TransacoesService.findDespesasUltimosMeses(usuarioId, 3)`, uma média móvel real de 3 meses.
3. **Fallback arbitrário (40.000):** removido — se não houver histórico, a base fica em 0, e o frontend deve mostrar um aviso de "histórico insuficiente para projeção" em vez de um número inventado.

**Ficheiros alterados:** `projecao/projecao-fluxo-caixa.service.ts`, `projecao/projecao.module.ts`.

---

### 2.3 Orçamento semanal agora é calculado corretamente

**Problema:** `getStatusDetalhado` calculava sempre "dia do mês" / "dias no mês", mesmo para orçamentos com `periodo: 'semanal'`.

**Correção:** o cálculo agora bifurca por `periodo` — orçamentos mensais continuam a usar o mês civil; orçamentos semanais usam a semana corrente (segunda a domingo), com o próprio gasto por categoria calculado só dentro dessa janela.

**Ficheiro alterado:** `orcamentos/orcamentos.service.ts`.

---

### 2.4 Espaços partilhados: permissão e cálculo real de acertos

**Problemas:**
1. Qualquer membro podia adicionar outros membros ao espaço, independentemente do seu papel.
2. `calcularAcertos` não calculava nada real — devolvia só uma divisão igualitária genérica, sem olhar para nenhuma transação.

**Correções:**
1. `addMembro` agora verifica se quem está a chamar é `proprietario` ou `administrador`; caso contrário, lança `ForbiddenException`.
2. Novos campos `espacoPartilhadoId` e `divisaoConjunta` em `Transacao`. `calcularAcertos` agora usa `TransacoesService.findConjuntasPorEspaco()` para somar o que cada membro **pagou de facto** (transações que registou, marcadas como conjuntas) contra o que **lhe cabia pagar** segundo o `percentualDivisaoPadrao`, devolvendo um saldo por membro (positivo = é credor, negativo = deve aos outros).

**Ficheiros alterados:** `transacoes/transacao.entity.ts`, `transacoes/dto/create-transacao.dto.ts`, `espacos-partilhados/espacos-partilhados.service.ts`, `espacos-partilhados/espacos-partilhados.module.ts`.

**Ação necessária no frontend:** ao lançar uma despesa num espaço partilhado, adicionar um toggle "Esta despesa é conjunta?" que define `espacoPartilhadoId` e `divisaoConjunta: true` no payload.

---

### 2.5 Race condition na atualização de saldo

**Problema:** `recalcularSaldo` fazia leitura-depois-escrita (`find` + `save`), vulnerável a condição de corrida quando duas transações chegam quase ao mesmo tempo (ex: duas mensagens de WhatsApp seguidas podiam fazer o segundo lançamento sobrescrever o efeito do primeiro).

**Correção:** substituído por `contasRepository.increment()`, que faz um `UPDATE saldo_atual = saldo_atual + delta` atómico diretamente na base de dados.

**Ficheiro alterado:** `contas/contas.service.ts`.

---

### 2.6 Segurança: JWT_SECRET sem valor de fallback

**Problema:** havia um segredo fixo hardcoded (`'fincontrol-default-secret-key-change-me'`) usado se a variável de ambiente não estivesse definida — visível a qualquer pessoa que veja o código-fonte.

**Correção:** o servidor agora falha ao arrancar (`throw new Error(...)`) se `JWT_SECRET` não estiver configurado, em vez de usar um valor previsível.

**Ficheiros alterados:** `auth/auth.module.ts`, `auth/jwt.strategy.ts`.

**Ação necessária:** garantir que `JWT_SECRET` está definido nas variáveis de ambiente de produção (Vercel/Railway/etc.) antes do próximo deploy, ou o backend não vai arrancar.

---

### 2.7 Ajustes menores

- **Câmbio:** a taxa "oficial" vem de um agregador de mercado (`open.er-api.com`), não do Banco Nacional de Angola. Adicionado o campo `fonteTaxaOficial` na resposta da API, com o texto explícito, para o frontend poder mostrar essa distinção ao utilizador.
- **Parser de WhatsApp:** agora prioriza um número que tenha um indicador de moeda explícito a seguir (ex: "5000 kz"), em vez de assumir sempre o primeiro número da frase — evita capturar por engano um número de hora ou data escrito antes do valor.

**Ficheiros alterados:** `cambio/cambio.service.ts`, `whatsapp/parser/whatsapp-parser.service.ts`.

---

## 3. O Que Ainda Não Foi Corrigido (por decisão de escopo)

Estes ficaram de fora desta rodada por serem de maior esforço ou dependerem de decisão de produto:

- **Transação atómica completa em `TransacoesService.create()`:** o `increment()` resolve a condição de corrida no saldo, mas criar a transação e atualizar o saldo ainda são duas operações separadas — se a segunda falhar, fica inconsistência. O ideal é envolver ambas numa transação de base de dados (`queryRunner`/`manager.transaction()`).
- **Limpeza automática de contas convidado antigas** (mencionado na secção 1.2).
- **Parsers de importação específicos por banco** (BAI, BFA, Millennium) — o parser atual é um CSV genérico por posição de coluna, que funciona mas não é robusto ao formato real de exportação de cada banco.
- **Verificação de posse de `contaId` em cada chamada a `recalcularSaldo`** dentro de `remove()` da conta destino de uma transferência — hoje confia que já foi validado antes; não é um risco de segurança prático dado o fluxo atual, mas vale endurecer no futuro.

---

## 4. Novas Ideias

### 4.1 Auditoria de confiança do parser do WhatsApp
Guardar, para cada `MensagemProcessada`, se a categoria/valor foi aceite diretamente ou corrigido pelo utilizador. Ao fim de algumas semanas, isto dá-te um relatório real de "taxa de acerto" do parser por tipo de mensagem — e é a base de dados perfeita para, mais tarde, treinar ou ajustar regras de categorização automaticamente por utilizador (ex: "para este utilizador, 'kero' significa sempre Alimentação").

### 4.2 "Modo reconciliação" mensal
Uma vez por mês, o bot envia proativamente um resumo tipo *"Este mês tiveste 3 lançamentos marcados como suspeitos de duplicado, ainda por resolver — responde 'rever' para veres a lista."* Isto evita que duplicados sinalizados fiquem esquecidos para sempre no limbo `SUSPEITO`.

### 4.3 Indicador de "confiança da projeção" na interface
Já que a projeção de fluxo de caixa e a de rendimento variável agora devolvem intervalos honestos (incluindo `0` quando não há histórico), vale a pena o frontend mostrar um selo visual: "Alta confiança" (3+ meses de histórico), "Confiança moderada" (1-2 meses), "Sem histórico suficiente" (0). Isto transforma uma limitação técnica em transparência, que reforça a confiança no produto em vez de a minar.

### 4.4 Papel "visualizador_resumo" ainda não tem lógica de restrição
O enum `PapelEspaco` no código atual só tem `PROPRIETARIO`, `ADMINISTRADOR`, `MEMBRO` — falta o `visualizador_resumo` que desenhámos no modelo de dados original, que permite ver só totais agregados sem detalhe de transações individuais dos outros membros. Vale a pena adicionar esse papel e a lógica de filtragem correspondente no endpoint que lista transações de um espaço partilhado (quando esse endpoint existir).

### 4.5 Alerta de câmbio favorável
Já que o `CambioService` já faz fetch periódico de cotações reais, dá para guardar um pequeno histórico diário e o bot avisar proativamente: *"A taxa USD/AOA subiu 3% esta semana — pode ser boa altura para converter poupança em USD para AOA, se precisares de liquidez."* É um insight genuinamente diferenciador para o contexto angolano, e não precisa de IA — é só comparar a cotação de hoje com a de X dias atrás.

### 4.6 "Modo negócio pequeno" como teste de mercado B2B antecipado
Antes de investir na Fase 9 completa (B2B), vale a pena testar a procura com o mínimo possível: adicionar um único campo opcional `finalidade: 'pessoal' | 'negocio'` numa `Conta`, e permitir gerar um relatório simples de "receitas menos despesas por categoria" filtrado por essa finalidade. Isto testa se há procura real de pequenos negócios angolanos (vendedores informais, por exemplo) sem construir toda a arquitetura multi-utilizador-por-empresa do roadmap original.

### 4.7 Modo "sem dados móveis" (offline-first parcial)
Dado que os dados móveis são caros/limitados em Angola, considerar cache local no frontend (via React Query com `staleTime` generoso) para o dashboard funcionar razoavelmente bem com conexão instável, e permitir que o lançamento manual funcione offline com fila de sincronização quando a conexão voltar — reduz a dependência de estar sempre online para uma ação tão básica como registar uma despesa.

---

*Próximo passo sugerido: aplicar as alterações do zip ao repositório, correr `npm run migration:generate` (ou equivalente) para gerar a migração dos novos campos (`fonteRendimentoId`, `espacoPartilhadoId`, `divisaoConjunta`, `codigoVinculacaoWhatsapp`, `codigoVinculacaoExpiraEm`), e testar manualmente o fluxo de vinculação de WhatsApp antes de lançar a próxima versão.*
