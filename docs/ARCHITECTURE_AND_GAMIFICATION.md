# 🚀 FinControl: Documentação de Arquitetura, Gamificação e UI/UX Pro Max

Este documento detalha todo o processo de refatoração, gamificação e melhorias de UI/UX aplicadas ao **FinControl Engine**.

---

## 🎯 1. Princípios de Gamificação & Engajamento

O maior obstáculo em aplicativos financeiros é a retenção do usuário. Para resolver isso, implementamos o **Loop de Hábito Positivo**:

1. **Sistema de Streaks (Sequência Diária de Registros) 🔥**:
   - Cada dia com pelo menos um registro ou *check-in* incrementa o streak do usuário.
   - Cálculo automático de streak atual e recorde histórico (*best streak*).
   - Botão de **Check-in "Dia Sem Gastos Extras"**: Permite manter o streak ativo mesmo nos dias em que o usuário não gastou nada, incentivando o autocontrole.

2. **Níveis de Consciência Financeira (XP & Badges) 🏆**:
   - **🌱 Poupador Iniciante:** Primeiro registro efetuado.
   - **🔥 Fogo do Hábito:** 3 dias seguidos registrando.
   - **⚡ Sentinela da Semana:** 7 dias consecutivos.
   - **🛡️ Mestre do Orçamento:** 30 dias de controle contínuo.

3. **Feedback Visual Positivo**:
   - Indicadores visuais do progresso do mês e badges comemorativas ativadas dinamicamente.

---

## 🎨 2. UI/UX Pro Max: Design System & Temas (Dark / Light Mode)

Seguindo as diretrizes do **UI/UX Pro Max**, transformamos a interface em um padrão moderno e ergonômico:

- **Estilo Glassmorphism Premium**: Efeito translúcido com `backdrop-filter: blur(16px)`, bordas sutis com `color-mix` e sombras em camadas de profundidade.
- **Suporte Nativo a Modo Claro e Escuro**:
  - **Dark Mode:** `#0B0F19` como base, trazendo menor fadiga visual e destaque em néon controlado (Laranja Chama para Streaks, Esmeralda para economias e Azul Real para ações).
  - **Light Mode:** `#F8FAFC` com cards brancos de alto contraste e legibilidade WCAG AAA.
- **Microinterações:**
  - Animações suaves de transição (`transition: all 0.2s cubic-bezier(...)`).
  - Efeito de hover e elevação nos cartões de estatísticas e gráficos.
  - Alinhamento de números com precisão tabular (`font-variant-numeric: tabular-nums`).

---

## 🔐 3. Autenticação Google & Isolamento de Dados

- **Frontend:** Suporte a Login Social com Google OAuth2 (`@react-oauth/google` / JWT) e modo de autenticação flexível.
- **Backend (NestJS + TypeORM + Neon DB):**
  - Associação de cada despesa ao identificador do usuário.
  - Persistência das estatísticas de streak e histórico no banco PostgreSQL.

---

## 🛠️ 4. Como Executar e Variáveis de Ambiente

### Backend (.env)
```env
PORT=3000
DATABASE_URL=postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
GOOGLE_CLIENT_ID=seu_google_client_id.apps.googleusercontent.com
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=seu_google_client_id.apps.googleusercontent.com
```
