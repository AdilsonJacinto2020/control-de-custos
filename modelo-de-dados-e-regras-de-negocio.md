# FinControl AO — Modelo de Dados e Regras de Negócio

> Documento de arquitetura de produto para uma app de controlo financeiro pessoal (com potencial de expansão B2B), desenhada para o mercado angolano, com entrada de dados mobile-first via WhatsApp, importação de extrato e OCR de recibo.

---

## 1. Visão do Produto

**Problema central que resolvemos:** apps de finanças pessoais falham porque exigem lançamento manual de cada transação, o que gera abandono em poucas semanas. Em Angola, isto é agravado pela ausência de Open Finance (regulação de partilha bancária automática, como existe no Brasil), pela informalidade de rendimento e pela instabilidade cambial do Kwanza.

**Estratégia:** reduzir a fricção de entrada ao máximo possível dentro das limitações reais do mercado (WhatsApp como canal principal, importação de extrato, OCR de recibo), e diferenciar-se por regras de negócio que resolvem dores específicas e mal atendidas: multi-moeda honesto, rendimento variável, e finanças partilhadas de família/casal.

**Fases de mercado:**
1. **Fase 1 (foco atual):** pessoas físicas (B2C), mercado angolano, produto web mobile-first + bot de WhatsApp.
2. **Fase 2 (futuro):** expansão para pequenas empresas (B2B), reaproveitando o mesmo motor de contas/transações/orçamento.

---

## 2. Canais de Entrada de Dados

| Canal | Fricção | Como funciona | Prioridade |
|---|---|---|---|
| **Bot de WhatsApp** | Muito baixa | Mensagem em linguagem natural ("gastei 5000 kz em táxi") ou foto de recibo enviada diretamente no chat | MVP — canal principal |
| **Importação de extrato (CSV/PDF)** | Baixa (mas periódica, não em tempo real) | Upload manual do extrato do internet banking (BAI Directo, BFA Net, Millennium Atlântico, Standard Bank AO); parser dedicado por banco | MVP |
| **Foto de recibo (OCR)** | Baixa | Câmara do browser ou envio via WhatsApp; extrai valor, data, comerciante | MVP (via WhatsApp) / Fase 2 (via site) |
| **Lançamento manual no site** | Média | Formulário tradicional, sempre disponível como fallback | MVP |
| **E-mail (parsing de notificações bancárias)** | — | **Descartado** — considerado invasivo pelo utilizador-alvo | Fora do roadmap |
| **Leitura de SMS bancário** | — | Tecnicamente impossível numa PWA/site (bloqueado por segurança em iOS e Android); só viável numa app nativa Android futura, com permissão explícita | Fase futura (nativo Android) |
| **Conexão bancária automática (Open Finance)** | Nula | Não existe regulação equivalente em Angola atualmente | Fora do roadmap por agora |

**Nota sobre notificações:** o WhatsApp resolve também o problema de notificações no iOS — Web Push só funciona em iPhone se o site estiver instalado no ecrã principal (iOS 16.4+), enquanto o WhatsApp entrega notificações nativamente em qualquer telemóvel sem instalação. Por isso o bot é o canal principal de interação diária; o site funciona como painel de análise aprofundada.

---

## 3. Modelo de Dados — Entidades

### 3.1 `Usuario`
Representa a pessoa dona da conta na plataforma.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nome | string | |
| email | string, opcional | login pode ser só WhatsApp |
| telefoneWhatsapp | string, único | canal principal de identificação |
| moedaReferencia | enum (AOA, USD, EUR) | moeda usada para consolidar dashboards |
| modeloOrcamento | enum (`envelope`, `percentual_50_30_20`, `baseado_em_metas`) | escolhido no onboarding |
| criadoEm / atualizadoEm | timestamp | |

**Regra:** o `modeloOrcamento` é escolhido uma vez no onboarding (tipo "teste de personalidade financeira") e determina como a interface calcula alertas e o que é mostrado em destaque — não se misturam os três modelos simultaneamente.

---

### 3.2 `Conta`
Representa uma "carteira" de dinheiro com saldo e moeda próprios.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId / espacoPartilhadoId | UUID | dono individual OU espaço partilhado (nunca os dois) |
| nome | string | ex: "Conta BAI", "Carteira Multicaixa Express", "Dinheiro" |
| tipo | enum (`banco`, `carteira_movel`, `dinheiro_fisico`, `poupanca`) | |
| moeda | enum (AOA, USD, EUR, ...) | **fixa por conta — nunca mista** |
| saldoAtual | decimal | calculado a partir das transações, não editável diretamente |
| ativa | boolean | soft-delete |

**Regras de negócio:**
- Uma conta tem sempre **uma única moeda**. Não existe "conta multi-moeda" — se o utilizador quer USD e AOA, cria duas contas.
- `saldoAtual` nunca é digitado manualmente após a criação — é sempre derivado da soma de transações. Isto evita divergência entre "o que o utilizador acha que tem" e "o que os lançamentos dizem que tem".
- Tipos de conta cobrem explicitamente carteiras móveis (Multicaixa Express, Unitel Money) e dinheiro físico, refletindo a informalidade real do mercado angolano — não assumir que toda a movimentação passa por banco.

---

### 3.3 `Transacao`
Substitui a antiga entidade `Despesa` — suporta entrada, saída e transferência.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| contaId | UUID | FK para `Conta` |
| tipo | enum (`receita`, `despesa`, `transferencia_entre_contas`) | |
| valor | decimal | sempre positivo; o `tipo` define o sinal |
| moeda | enum | herdada da conta, guardada explicitamente para histórico |
| categoriaId | UUID, opcional se `transferencia` | FK para `Categoria` |
| descricao | string | |
| data | date | |
| origem | enum (`whatsapp`, `import_extrato`, `ocr_recibo`, `manual`, `evento_projetado`) | rastreia proveniência para auditoria e deduplicação |
| contaDestinoId | UUID, obrigatório se `transferencia_entre_contas` | |
| taxaCambioUsada | decimal, opcional | preenchida quando a transferência envolve conversão entre moedas |
| statusDuplicado | enum (`nenhum`, `suspeito`, `confirmado_unico`, `confirmado_duplicado`) | ver seção 5.4 |
| criadoEm / atualizadoEm | timestamp | |

**Regras de negócio:**
- **Transferência entre contas próprias não é receita nem despesa** — não entra nos totais de "gasto do mês", mesmo que mude o saldo de duas contas.
- Quando a transferência cruza moedas (ex: AOA → USD), `taxaCambioUsada` é obrigatória e fica registada permanentemente — os valores nunca são recalculados retroativamente com taxa atual.
- `origem` existe para (a) mostrar ao utilizador de onde veio cada lançamento, e (b) alimentar a lógica de deduplicação entre canais.

---

### 3.4 `Categoria`
Hierárquica e editável pelo utilizador — substitui o enum fixo original.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId | UUID, nulo se for categoria padrão do sistema | |
| nome | string | |
| categoriaPaiId | UUID, opcional | permite subcategorias (ex: "Alimentação > Restaurante") |
| icone / cor | string | |
| regrasDeCategorização | array de palavras-chave | usadas para auto-categorizar import de extrato e mensagens do WhatsApp |

**Regra:** categorias padrão do sistema vêm pré-criadas (as 7 originais + outras comuns), mas o utilizador pode criar, editar ou arquivar as suas. Isto resolve o problema de categorias fixas hardcoded em dois lugares do código, identificado na versão anterior do produto.

---

### 3.5 `FonteDeRendimento`
Separa rendimento fixo de variável — decisão central para o mercado angolano.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId | UUID | |
| nome | string | ex: "Salário", "Biscate de fim de semana" |
| tipo | enum (`fixo`, `variavel`) | |
| valorFixo | decimal, obrigatório se `fixo` | |
| diaRecebimentoEstimado | int, opcional | |
| contaDestinoPadraoId | UUID | conta onde normalmente cai este rendimento |

**Regra de negócio (a mais importante desta entidade):**
Para fontes `variaveis`, o sistema **nunca assume um valor fixo nas projeções**. Calcula uma média móvel dos últimos 3 meses de transações do tipo `receita` ligadas a essa fonte, e projeta um **intervalo** (ex: "entre 45.000 e 60.000 Kz"), não um número único. Isto evita prometer precisão que a realidade do rendimento informal não sustenta, e mantém a confiança do utilizador no produto.

---

### 3.6 `Orcamento`
Limite definido pelo utilizador, ligado a uma categoria e um período.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId / espacoPartilhadoId | UUID | |
| categoriaId | UUID | |
| valorLimite | decimal | |
| moeda | enum | |
| periodo | enum (`mensal`, `semanal`) | |
| percentualAlertaPrimario | int, default 80 | dispara aviso quando o gasto atinge esta % |

**Regras de negócio:**
- O sistema recalcula, ao ritmo de gasto atual, uma **projeção linear** de quando o limite será ultrapassado dentro do período ("ao ritmo atual, vais ultrapassar o orçamento de Lazer em 4 dias") — isto é cálculo determinístico, não IA.
- Se o mesmo orçamento for ultrapassado 3 períodos seguidos, o sistema sugere revisão do limite (ele pode estar mal calibrado, e continuar a "falhar" o mesmo orçamento todo mês corrói a motivação do utilizador).

---

### 3.7 `MetaDePoupanca`

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId / espacoPartilhadoId | UUID | |
| nome | string | ex: "Fundo de emergência", "Enxoval do bebé" |
| valorObjetivo | decimal | |
| moeda | enum | |
| dataAlvo | date, opcional | |
| valorAcumulado | decimal | derivado de transações marcadas como contribuição a esta meta |

**Regra:** uma contribuição a uma meta é uma `Transacao` do tipo `transferencia_entre_contas` para uma conta do tipo `poupanca` associada à meta, ou um marcador direto na transação — nunca um número editado manualmente, pela mesma razão do saldo de conta.

---

### 3.8 `EventoFuturo`
O motor de simulação de cenários (ex: nascimento de um filho).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId / espacoPartilhadoId | UUID | |
| nome | string | ex: "Nascimento do bebé", "Mudança de casa" |
| status | enum (`planeado`, `ativo`, `concluido`, `descartado`) | |
| dataInicio | date | |
| dataFim | date, opcional | nulo = permanente |
| itens | array de `ItemDeCustoEvento` | ver abaixo |

**`ItemDeCustoEvento`:**
| Campo | Tipo | Notas |
|---|---|---|
| descricao | string | ex: "Enxoval", "Fralda" |
| tipo | enum (`unico`, `recorrente`) | |
| valor | decimal | |
| categoriaId | UUID | |

**Regras de negócio:**
- Um evento em estado `planeado` **não afeta** nenhum cálculo real — existe só para simulação/comparação lado a lado ("filho em Junho vs. Dezembro").
- Só ao mudar para `ativo` é que os itens recorrentes passam a ser considerados na projeção de fluxo de caixa real (seção 5).
- Múltiplos eventos podem coexistir em `planeado` sem interferir uns nos outros — permite comparação de cenários.

---

### 3.9 `EspacoPartilhado` e `MembroEspacoPartilhado`
Suporta casais e agregados familiares alargados (não limitado a 2 pessoas).

**`EspacoPartilhado`:**
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nome | string | ex: "Casa da Família Silva" |
| moedaPadrao | enum | |

**`MembroEspacoPartilhado`:**
| Campo | Tipo | Notas |
|---|---|---|
| usuarioId | UUID | |
| espacoPartilhadoId | UUID | |
| papel | enum (`admin`, `contribuinte`, `visualizador_resumo`) | controla permissão de visualização |
| percentualDivisaoPadrao | decimal, opcional | usado na divisão automática de despesas conjuntas |

**Regras de negócio:**
- Cada membro mantém as suas **próprias contas pessoais** (privadas por padrão). Contas do tipo "conjunta" pertencem ao `EspacoPartilhado` diretamente.
- Uma `Transacao` numa conta pessoal pode ser marcada como `divisaoConjunta = true`, com um método de divisão: `50_50`, `proporcional_ao_rendimento`, `valor_fixo`. Isto gera automaticamente um "saldo a acertar" entre os membros, sem mover dinheiro de facto.
- O papel `visualizador_resumo` permite a um membro ver só totais agregados do espaço, sem detalhe de cada transação individual dos outros — importante para dar autonomia sem forçar transparência total logo de início (fricção comum em casais/famílias que estão a começar a partilhar finanças).

---

### 3.10 `RegraDeDeduplicacao` (não é uma entidade persistente, é uma regra de processamento)

Aplicada sempre que uma `Transacao` é criada via `import_extrato`:

1. Procurar transações existentes na mesma `Conta`, com `valor` dentro de uma margem de tolerância (ex: ±1%), e `data` dentro de uma janela de ±2 dias.
2. Se encontrado: marcar a nova transação como `statusDuplicado = suspeito` e **não subtrair automaticamente** — apresentar ao utilizador para confirmar "é a mesma" (ignora a importada) ou "são duas diferentes" (`confirmado_unico` em ambas).
3. Nunca decidir automaticamente por conta própria — evita corromper silenciosamente o histórico financeiro do utilizador.

---

## 4. Bot de WhatsApp — Arquitetura e Fluxo Detalhado

Este é o canal principal de interação diária (ver seção 2). O site é o painel de análise; o WhatsApp é onde o utilizador vive no dia a dia.

### 4.1 Stack e Componentes Técnicos

| Componente | Opção recomendada | Notas |
|---|---|---|
| Canal de mensagens | WhatsApp Business Platform (Cloud API, via Meta) ou um BSP (Business Solution Provider, ex: Twilio, Gupshup, 360dialog) | Um BSP acelera o setup inicial (verificação de número, templates aprovados) — vale a pena para não bloquear o MVP em burocracia de aprovação direta com a Meta |
| Recepção de mensagens | Webhook HTTP no backend (endpoint dedicado, ex: `POST /webhooks/whatsapp`) | Meta/BSP envia cada mensagem recebida para este endpoint |
| Processamento de texto | Parser de regras + biblioteca de NLP leve (extração de valor, moeda, data, palavra-chave de categoria) | Não precisa de IA generativa nesta fase — regras determinísticas cobrem a maioria dos casos (ver 4.3) |
| Processamento de imagem (recibo) | Serviço de OCR (ex: Google Cloud Vision, Tesseract self-hosted, ou provedor de OCR dedicado) | Extrai texto bruto da foto; depois passa pelo mesmo parser de valor/data |
| Fila de processamento | Fila assíncrona (ex: BullMQ sobre Redis, ou similar) | Evita que o webhook fique bloqueado à espera do OCR/parsing — responde rápido à Meta e processa em background |
| Envio de respostas | Mesma API do WhatsApp Business, em resposta ao número do utilizador | Respeitar limites de janela de 24h para mensagens fora de template, conforme política do WhatsApp |

### 4.2 Nova Entidade: `ConversaWhatsapp`

Guarda o estado da interação em curso, para permitir fluxos de múltiplos passos (ex: pedir confirmação antes de gravar).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| usuarioId | UUID | vinculado por `telefoneWhatsapp` no primeiro contacto |
| estado | enum (`aguardando_lancamento`, `aguardando_confirmacao`, `aguardando_correcao_categoria`, `aguardando_valor_ambiguo`, `idle`) | máquina de estados da conversa |
| transacaoRascunhoId | UUID, opcional | referência à `Transacao` ainda não confirmada, criada em rascunho |
| ultimaInteracaoEm | timestamp | usado para expirar conversas paradas (ex: >30 min volta a `idle`) |

**Nova Entidade: `MensagemProcessada`** (log/auditoria)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| conversaId | UUID | FK |
| tipoConteudo | enum (`texto`, `imagem`, `audio`) | áudio fica fora do MVP, mas o campo já previne retrabalho futuro |
| conteudoBruto | text | mensagem original ou referência à imagem armazenada |
| resultadoParsing | jsonb | valor/categoria/data extraídos, com nível de confiança por campo |
| transacaoGeradaId | UUID, opcional | link para a `Transacao` final, se confirmada |

### 4.3 Fluxo de Lançamento por Texto

1. **Utilizador envia:** `"gastei 5000 kz em táxi"`
2. **Parser extrai:**
   - **Valor + moeda:** regex/gramática simples para números seguidos de indicador de moeda (`kz`, `Kz`, `AOA`, `$`, `usd`) — se não houver indicador, assume a moeda padrão da conta principal do utilizador.
   - **Direção (receita/despesa):** palavras-gatilho — `"gastei"`, `"paguei"`, `"comprei"` → despesa; `"recebi"`, `"ganhei"`, `"entrou"` → receita. Default: despesa (é o caso mais comum).
   - **Categoria:** correspondência contra `regrasDeCategorização` de cada `Categoria` do utilizador (ex: "táxi" → Transporte). Cada correspondência tem um nível de confiança (correspondência exata de palavra-chave = alta; nenhuma correspondência = baixa).
   - **Data:** default é a data/hora da mensagem, a menos que o texto contenha uma referência explícita ("ontem", "dia 20").
3. **Decisão por nível de confiança:**
   - **Confiança alta em todos os campos:** cria a `Transacao` diretamente com `origem = whatsapp`, e responde com confirmação e opção de desfazer: *"✅ Registado: 5.000 Kz em Transporte, hoje. Responde 'errado' para corrigir."*
   - **Confiança baixa na categoria:** cria a `Transacao` em rascunho (não persistida como definitiva), muda `ConversaWhatsapp.estado` para `aguardando_correcao_categoria`, e pergunta: *"Em que categoria fica isto? 1) Transporte 2) Outros"* — resposta numérica simples.
   - **Valor ambíguo ou ausente:** pede esclarecimento direto antes de prosseguir, sem adivinhar.
4. **Janela de correção pós-confirmação:** mesmo depois de confirmada, a última transação lançada por WhatsApp pode ser corrigida ou apagada respondendo `"errado"` dentro de uma janela curta (ex: 10 minutos), sem precisar de abrir o site.

### 4.4 Fluxo de Foto de Recibo

1. Utilizador envia uma foto diretamente no chat.
2. Mensagem entra na fila de processamento (`tipoConteudo = imagem`); o bot responde de imediato com um acknowledgement (*"📸 Recibo recebido, a processar..."*) para não parecer que travou.
3. OCR extrai texto bruto → mesmo parser de valor/data do fluxo de texto é aplicado ao texto extraído, mais uma tentativa de identificar o nome do comerciante (para sugestão de categoria futura via `regrasDeCategorização`).
4. Segue o mesmo mecanismo de confiança e confirmação do fluxo 4.3 (alta confiança confirma direto; baixa confiança pergunta).
5. Se o OCR falhar completamente em extrair um valor: responde pedindo para o utilizador digitar manualmente ("Não consegui ler o valor do recibo — quanto foi?"), sem descartar a imagem (guarda para revisão manual futura, se necessário).

### 4.5 Alertas e Resumos Proativos (bot fala primeiro)

O bot não é só reativo — dispara mensagens por iniciativa própria, disparadas por regras já definidas nas seções 3.6 e 4:

- **Alerta de orçamento:** quando a projeção linear (seção 3.6) indica que um `Orcamento` vai ser ultrapassado antes do fim do período.
- **Resumo semanal:** totais por categoria, comparados à semana anterior.
- **Lembrete de meta:** progresso de uma `MetaDePoupanca` perto da `dataAlvo`.

**Regra importante:** estas mensagens proativas usam templates pré-aprovados pela Meta (exigência da plataforma para mensagens fora da janela de 24h de conversa ativa) — isto precisa de ser configurado/aprovado com antecedência e não pode ser texto livre gerado on-the-fly.

### 4.6 Ligação com Deduplicação (seção 3.10)

Toda `Transacao` criada via WhatsApp entra automaticamente com `origem = whatsapp`. Quando o utilizador mais tarde importa um extrato do mesmo período, a regra de deduplicação (3.10) compara também contra estas transações — é o caso mais comum de duplicação na prática (lança na hora pelo WhatsApp, depois importa o extrato do mês inteiro).

### 4.7 Casos de Erro a Tratar Explicitamente

| Situação | Comportamento esperado |
|---|---|
| Mensagem sem nenhum valor identificável | Responder pedindo o valor, sem criar rascunho vazio |
| Utilizador não vinculado (número desconhecido) | Fluxo de onboarding simplificado por chat, antes de aceitar lançamentos |
| Conversa parada a meio (ex: aguardando categoria há >30 min) | Expira o rascunho, volta a `idle`, próxima mensagem começa fluxo novo do zero |
| Falha do serviço de OCR | Acknowledgement de erro claro, pedir para tentar de novo ou digitar manualmente |
| Múltiplas contas do utilizador sem indicação de qual usar | Perguntar qual conta, ou usar uma conta "padrão" configurável no onboarding |

---

## 5. Motor de Projeção de Fluxo de Caixa (determinístico, sem IA)

Fórmula base, calculada por mês futuro:

```
SaldoProjetado(mês) =
    SaldoAtual(conta)
  + Σ ReceitasRecorrentesFixas
  + Σ ReceitasVariáveis (intervalo, baseado em média móvel 3 meses)
  − Σ DespesasRecorrentes
  − Σ ItensDeCustoDeEventosAtivos(nesse mês)
  ± AjustePorTendênciaDeGastoVariável (média móvel 3 meses por categoria)
```

- O resultado é sempre apresentado como **intervalo**, nunca como número único, quando há componentes variáveis envolvidos — coerente com a filosofia de honestidade sobre incerteza (seção 3.5).
- Cada `EventoFuturo` em `planeado` pode ser simulado isoladamente e comparado lado a lado com o cenário "sem o evento", sem alterar dados reais.

---

## 6. Regras de Negócio Transversais

1. **Nenhum valor financeiro é editável diretamente** — saldo de conta, valor acumulado de meta, tudo é derivado de transações. Isto evita divergência entre o que o sistema mostra e o histórico real.
2. **Moeda nunca é convertida silenciosamente** — toda transação guarda a moeda original em que ocorreu; conversões para exibição consolidada acontecem só na camada de apresentação, nunca alteram dados armazenados.
3. **Origem da taxa de câmbio é sempre explícita** — "oficial" vs. "personalizada" — nunca apresentar um número convertido sem indicar de onde veio a taxa.
4. **Deduplicação é assistida, não automática** — o sistema sinaliza, o utilizador decide.
5. **Rendimento variável nunca produz projeções de falsa precisão** — sempre intervalo, nunca número único.
6. **Eventos futuros só afetam projeções reais quando ativados explicitamente pelo utilizador** — planeamento e simulação são espaços seguros e reversíveis.
7. **Modelo de orçamento (envelope / 50-30-20 / metas) é escolhido uma vez e usado de forma consistente** — não se mistura lógica de UI/alertas de modelos diferentes.
8. **Espaços partilhados preservam autonomia individual por padrão** — visibilidade total é opt-in, não o padrão inicial.

---

## 7. Roadmap Sugerido (MVP → Diferenciação)

| Fase | Entrega |
|---|---|
| **MVP** | `Usuario`, `Conta` (multi-moeda, incl. carteira móvel/dinheiro), `Transacao` (receita/despesa/transferência), `Categoria` editável, lançamento manual + bot de WhatsApp completo (`ConversaWhatsapp`, `MensagemProcessada`, fluxo de texto e foto de recibo com confirmação) |
| **MVP+** | Importação de extrato com deduplicação assistida, `Orcamento` com alertas de projeção linear |
| **Fase 2** | `FonteDeRendimento` (fixo/variável), Motor de Projeção de Fluxo de Caixa, `MetaDePoupanca` |
| **Fase 3** | `EventoFuturo` (simulação de cenários de vida) |
| **Fase 4** | `EspacoPartilhado` (casais/família), divisão de despesas conjuntas |
| **Fase 5 (B2B)** | Reaproveitamento do motor Conta/Transação/Orçamento para pequenas empresas |
| **Camada de IA (transversal, depois da fundação)** | Explicação em linguagem natural das projeções, alertas proativos, insights personalizados — sempre em cima dos números já calculados deterministicamente, nunca substituindo o cálculo |

---

## 8. Considerações Específicas do Mercado Angolano (resumo)

- Sem Open Finance — entrada de dados depende de WhatsApp, importação de extrato e OCR.
- WhatsApp como canal principal resolve também a limitação de notificações push no iOS (que só funcionam com o site instalado no ecrã principal).
- Carteiras móveis (Multicaixa Express, Unitel Money) tratadas como tipo de conta de primeira classe, não como acessório.
- Multi-moeda honesto (AOA/USD) reflete a prática real de guardar valor em dólares num contexto de instabilidade cambial.
- Rendimento informal/variável tratado com intervalos, não com falsa precisão de "salário fixo".
- Espaços partilhados desenhados para agregados familiares alargados, não só casais.
- Peso da app deve ser leve — dados móveis limitados são uma restrição de produto, não só técnica.

---

*Documento vivo — atualizar conforme validação com utilizadores reais em cada fase.*
