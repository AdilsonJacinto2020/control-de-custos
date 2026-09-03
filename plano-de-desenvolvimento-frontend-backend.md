# FinControl AO — Plano de Desenvolvimento (Frontend + Backend)

> Este documento assume como base o modelo de dados e regras de negócio definidos em `modelo-de-dados-e-regras-de-negocio.md`, e o código-base já existente (NestJS + TypeORM + PostgreSQL no backend, React + Vite + TypeScript no frontend). O objetivo é evoluir o projeto atual para o produto completo, fase a fase, sem reescrever do zero.

---

## 1. Princípios de Desenvolvimento

1. **Migração incremental, não reescrita.** O backend/frontend atuais servem de base — a entidade `Despesa` evolui para `Transacao`, não é substituída de repente. Cada fase entrega algo utilizável.
2. **Correção da fundação antes de features novas.** Autenticação real, isolamento de dados por utilizador e CORS restrito entram **antes** de qualquer entidade nova — sem isto, tudo o resto assenta em dados partilhados por engano.
3. **Regras de negócio determinísticas primeiro, IA depois.** Como já decidido, a camada de IA só entra depois do motor de cálculo (orçamento, projeção) estar sólido e testado.
4. **Mobile-first e leve.** Toda decisão de frontend prioriza performance em rede lenta/dados limitados.
5. **Testes automatizados desde a Fase 0** — o projeto atual só tem specs boilerplate; isto muda já na primeira fase, para não acumular dívida técnica logo de início.

---

## 2. Stack Tecnológico

### Backend
| Camada | Escolha | Notas |
|---|---|---|
| Framework | NestJS (já em uso) | manter — estrutura modular adequa-se bem ao crescimento por entidades |
| ORM | TypeORM (já em uso) | trocar `synchronize: true` por migrações versionadas a partir da Fase 0 |
| Base de dados | PostgreSQL (já em uso, Neon) | manter |
| Autenticação | JWT (access + refresh token), com Google OAuth verificado **no servidor** (não só decodificado no cliente) | corrige a falha crítica identificada na auditoria inicial |
| Fila assíncrona | BullMQ + Redis | necessário para o processamento do bot de WhatsApp (OCR, parsing) sem bloquear o webhook |
| OCR | Google Cloud Vision API (ou Tesseract self-hosted como alternativa mais barata no início) | avaliar custo por volume antes de decidir |
| Armazenamento de imagens (recibos) | S3-compatível (ex: Cloudflare R2, Backblaze B2) | mais barato que S3 puro para volumes iniciais pequenos |
| Documentação de API | Swagger/OpenAPI via `@nestjs/swagger` | facilita integração com o frontend e futura API pública B2B |
| Testes | Jest (unitário) + Supertest (e2e) | já disponível no boilerplate NestJS, só falta ser usado a sério |

### Frontend
| Camada | Escolha | Notas |
|---|---|---|
| Framework | React 19 + Vite + TypeScript (já em uso) | manter |
| Gestão de estado servidor | TanStack Query (React Query) | substituir chamadas diretas de `fetch` por cache/revalidação adequada — necessário assim que houver múltiplas entidades relacionadas |
| Formulários | React Hook Form + Zod | validação consistente com os DTOs do backend |
| Gráficos | manter biblioteca já em uso (Recharts ou similar), avaliar necessidade de gráfico de linha temporal para projeção de fluxo de caixa |
| PWA | `vite-plugin-pwa` | necessário para instalabilidade e Web Push (ver seção 4 do documento de modelo de dados) |
| Estilo | manter Tailwind (se já em uso) ou CSS modules — priorizar bundle pequeno |

### Infraestrutura
| Componente | Escolha | Notas |
|---|---|---|
| Hosting backend | Railway, Render, ou Fly.io | mais simples que gerir infraestrutura própria numa fase inicial |
| Hosting frontend | Vercel (já em uso) | manter |
| Filas/cache | Redis gerido (Upstash é uma opção com camada gratuita generosa) | |
| Monitorização de erros | Sentry (free tier) | ativar desde a Fase 0, não deixar para depois |
| CI/CD | GitHub Actions | lint + testes + build em cada PR; deploy automático em merge para `main` |

---

## 3. Estrutura de Módulos — Backend (NestJS)

```
src/
├── auth/                  # login, JWT, verificação server-side de OAuth
├── usuarios/              # perfil, moeda de referência, modelo de orçamento
├── contas/                # Conta (multi-moeda, tipos: banco/carteira móvel/dinheiro)
├── transacoes/            # Transacao (substitui despesas/), inclui transferências
├── categorias/            # Categoria hierárquica + regras de categorização
├── orcamentos/            # Orcamento + cálculo de projeção linear de alerta
├── fontes-rendimento/     # FonteDeRendimento (fixo/variável)
├── metas-poupanca/        # MetaDePoupanca
├── eventos-futuros/       # EventoFuturo + ItemDeCustoEvento + motor de simulação
├── espacos-partilhados/   # EspacoPartilhado + MembroEspacoPartilhado + divisão de despesas
├── import-extrato/        # parsers por banco (BAI, BFA, Millennium, Standard Bank) + deduplicação
├── whatsapp/
│   ├── webhook/            # endpoint que recebe mensagens da Meta/BSP
│   ├── conversa/            # ConversaWhatsapp — máquina de estados
│   ├── parser/               # extração de valor/moeda/categoria/data de texto
│   ├── ocr/                   # integração com serviço de OCR
│   └── mensagens/           # MensagemProcessada — log/auditoria
├── cambio/                 # taxas de câmbio (oficial vs. personalizada), consolidação multi-moeda
├── projecao/               # motor de fluxo de caixa determinístico
└── common/                 # guards, pipes, interceptors, decorators partilhados
```

Cada módulo segue o padrão já estabelecido no projeto atual: `*.entity.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, com `class-validator` em todos os DTOs de entrada.

---

## 4. Estrutura de Pastas — Frontend

```
src/
├── api/                    # clientes de API por módulo (ex: contas.ts, transacoes.ts)
├── components/
│   ├── ui/                  # componentes atómicos reutilizáveis
│   ├── dashboard/
│   ├── transacoes/
│   ├── orcamentos/
│   ├── eventos-futuros/
│   └── espaco-partilhado/
├── hooks/                  # hooks de React Query por entidade
├── context/                # AuthContext (corrigido para usar JWT real do backend)
├── pages/ (ou routes/)     # uma página por fluxo principal
├── types/                  # tipos partilhados, espelhando os DTOs do backend
└── utils/                  # formatação de moeda, datas, cálculo de exibição
```

---

## 5. Plano por Fases

### Fase 0 — Correção de Fundação (pré-requisito, antes de qualquer feature nova)
**Duração estimada:** 1–2 semanas

| Backend | Frontend |
|---|---|
| Implementar JWT real + verificação server-side do token do Google | Substituir decodificação client-side do JWT por chamada real ao backend |
| Adicionar `usuarioId` a todas as entidades e filtrar todas as queries por utilizador autenticado | Enviar token JWT em todas as chamadas de API (`Authorization: Bearer`) |
| Restringir CORS ao domínio real do frontend | — |
| Trocar `synchronize: true` por migrações TypeORM versionadas | — |
| Configurar Sentry, logging estruturado | Configurar Sentry no frontend |
| Escrever testes reais (unitário + e2e) para o CRUD existente | Escrever testes de componente para os fluxos existentes |

**Critério de saída da fase:** dois utilizadores distintos, autenticados, nunca veem dados um do outro — validado por teste e2e automatizado, não só manual.

---

### Fase 1 — MVP: Novo Modelo de Dados + Lançamento Manual
**Duração estimada:** 3–4 semanas

| Backend | Frontend |
|---|---|
| Migrar `Despesa` → `Transacao` (script de migração de dados existentes) | Atualizar formulário de lançamento para suportar tipo (receita/despesa/transferência) |
| Implementar `Conta` (multi-moeda, tipos incl. carteira móvel/dinheiro) | Tela de gestão de contas (criar, editar, arquivar) |
| Implementar `Categoria` hierárquica editável pelo utilizador | Tela de gestão de categorias, substituindo o enum fixo |
| Migrar consumo de categorias fixas para a nova entidade | Corrigir "Lançamentos no Mês" para filtrar por período real (bug identificado na auditoria) |
| Endpoint de resumo/dashboard com filtro por mês real | Atualizar dashboard para consumir o novo endpoint filtrado |

**Critério de saída:** o utilizador consegue gerir múltiplas contas em moedas diferentes, com categorias personalizadas, e o dashboard reflete o mês correto.

---

### Fase 2 — Bot de WhatsApp (o maior diferenciador de fricção)
**Duração estimada:** 4–5 semanas

| Backend | Frontend |
|---|---|
| Configurar conta WhatsApp Business (Cloud API ou BSP) | Tela de onboarding para vincular número de WhatsApp |
| Implementar `ConversaWhatsapp` e máquina de estados | Indicador no site de "última sincronização via WhatsApp" |
| Implementar parser de texto (valor/moeda/direção/categoria/data) | — |
| Implementar fila assíncrona (BullMQ) para processamento de mensagens | — |
| Integrar serviço de OCR para fotos de recibo | Tela de revisão de transações pendentes de confirmação (caso o utilizador prefira confirmar no site em vez de no chat) |
| Implementar `MensagemProcessada` (log/auditoria) | — |
| Testes de todos os casos de erro definidos na seção 4.7 do modelo de dados | — |

**Critério de saída:** um utilizador consegue lançar uma despesa por mensagem de texto e por foto de recibo, do início ao fim, sem abrir o site.

---

### Fase 3 — Orçamento, Importação de Extrato e Deduplicação
**Duração estimada:** 3–4 semanas

| Backend | Frontend |
|---|---|
| Implementar `Orcamento` + cálculo de projeção linear de alerta | Tela de definição de orçamento por categoria, com barra de progresso |
| Implementar parsers de importação por banco (começar por 1–2 bancos mais usados) | Fluxo de upload de extrato + revisão de duplicados sinalizados |
| Implementar `RegraDeDeduplicacao` | Tela de confirmação de possíveis duplicados |
| Alertas proativos via WhatsApp quando orçamento se aproxima do limite | — |

**Critério de saída:** o utilizador define um limite mensal por categoria e recebe aviso antes de o ultrapassar; consegue importar um extrato sem duplicar lançamentos já feitos por WhatsApp.

---

### Fase 4 — Rendimento, Projeção de Fluxo de Caixa e Metas
**Duração estimada:** 3–4 semanas

| Backend | Frontend |
|---|---|
| Implementar `FonteDeRendimento` (fixo/variável) com cálculo de média móvel | Tela de configuração de fontes de rendimento |
| Implementar motor de projeção de fluxo de caixa (seção 5 do modelo de dados) | Visualização de linha temporal de saldo projetado (com intervalo para componentes variáveis) |
| Implementar `MetaDePoupanca` | Tela de metas com progresso visual |

**Critério de saída:** o dashboard mostra uma projeção de saldo dos próximos meses, com intervalo honesto quando há rendimento variável envolvido.

---

### Fase 5 — Eventos Futuros (Simulação de Cenários)
**Duração estimada:** 2–3 semanas

| Backend | Frontend |
|---|---|
| Implementar `EventoFuturo` + `ItemDeCustoEvento` | Tela de criação/edição de evento com lista de itens de custo |
| Lógica de simulação (`planeado` vs `ativo`) integrada ao motor de projeção | Comparação lado a lado de cenários (ex: com/sem evento, ou duas datas diferentes) |

**Critério de saída:** o utilizador consegue simular o impacto de um evento de vida na projeção financeira sem afetar os dados reais até ativar o evento.

---

### Fase 6 — Espaços Partilhados (Casais/Família)
**Duração estimada:** 3–4 semanas

| Backend | Frontend |
|---|---|
| Implementar `EspacoPartilhado` + `MembroEspacoPartilhado` com papéis/permissões | Fluxo de convite de membros para um espaço partilhado |
| Lógica de divisão de despesas conjuntas (50/50, proporcional, valor fixo) | Tela de "saldo a acertar" entre membros |
| Ajustar todas as queries relevantes para suportar contexto de espaço partilhado além de individual | Alternância entre vista pessoal e vista do espaço partilhado |

**Critério de saída:** um casal consegue partilhar despesas conjuntas mantendo contas pessoais privadas, com divisão automática calculada corretamente.

---

### Fase 7 — Câmbio Multi-Moeda Avançado
**Duração estimada:** 1–2 semanas (pode correr em paralelo com fases anteriores, é isolado)

| Backend | Frontend |
|---|---|
| Serviço de taxa de câmbio oficial (integração com fonte pública/BNA se disponível via API, ou atualização manual periódica) | Seletor de "taxa oficial vs. personalizada" na conversão de exibição |
| Suporte a taxa personalizada definida pelo utilizador | Indicador visual de qual taxa está a ser usada em cada valor consolidado |

**Critério de saída:** o dashboard consolidado em moeda de referência sempre indica claramente a origem da taxa usada.

---

### Fase 8 — Camada de IA (transversal, só depois de tudo acima estar validado)
**Duração estimada:** a definir após validação das fases anteriores

| Backend | Frontend |
|---|---|
| Integração com API do Claude, com tools/function calling ligadas aos endpoints de resumo e projeção já existentes | Interface de chat/insights dentro do site (e possivelmente também respostas mais elaboradas via WhatsApp) |
| Geração de alertas proativos em linguagem natural, sempre em cima de números já calculados deterministicamente | — |

---

### Fase 9 — Expansão B2B (reaproveitamento do motor)
**Duração estimada:** a definir, só após tração validada em B2C

- Reaproveitar `Conta`, `Transacao`, `Categoria`, `Orcamento` para contexto empresarial (categorias fiscais, múltiplos utilizadores por empresa com papéis distintos, relatórios de fluxo de caixa empresarial).

---

## 6. Qualidade e Processo

- **Testes:** meta mínima de cobertura em `services` (regras de negócio) desde a Fase 0 — não é negociável, dado que esta é uma app financeira e erros de cálculo destroem confiança rapidamente.
- **Migrações de banco de dados:** toda alteração de schema a partir da Fase 0 passa por migração versionada, nunca por `synchronize: true`.
- **Revisão de segurança:** antes de cada fase que lida com dados sensíveis novos (Fase 0 auth, Fase 2 WhatsApp com dados financeiros via mensagem, Fase 6 espaços partilhados com múltiplos utilizadores), fazer uma revisão dedicada de permissões/isolamento de dados.
- **Feature flags:** considerar uma lib simples de feature flags a partir da Fase 2, para poder lançar o bot de WhatsApp a um grupo pequeno de utilizadores antes de abrir a todos.

---

## 7. Ordem de Prioridade Resumida

```
Fase 0 (fundação/segurança) 
  → Fase 1 (modelo de dados novo + manual) 
    → Fase 2 (WhatsApp — maior redutor de fricção) 
      → Fase 3 (orçamento + import extrato) 
        → Fase 4 (rendimento + projeção) 
          → Fase 5 (eventos futuros) 
            → Fase 6 (espaços partilhados) 
              → Fase 7 (câmbio avançado, pode paralelizar) 
                → Fase 8 (IA) 
                  → Fase 9 (B2B)
```

---

*Documento vivo — ajustar estimativas de tempo conforme a equipa/disponibilidade real, e revisar prioridades após feedback de utilizadores em cada fase.*
