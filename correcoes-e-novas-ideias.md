# FinControl AO — Correções de Segurança (v2) e Checklist do Bot de WhatsApp

> Acompanha o ficheiro `correcoes-seguranca-v2.zip`, com os 4 ficheiros corrigidos: `main.ts`, `auth/auth.module.ts`, `auth/jwt.strategy.ts`, `whatsapp/whatsapp-webhook.controller.ts`. Validado com `tsc --noEmit` (compila sem erros). As tuas melhorias recentes (Evolution API, parser mais robusto, webhook multi-formato) foram mantidas — só corrigi os pontos de segurança.

---

## 1. Correções de Segurança Reaplicadas

### 1.1 `JWT_SECRET` — removido o fallback fixo, outra vez

Tinhas revertido a minha correção anterior e posto de volta um segredo fixo no código:
```ts
'fincontrol_fallback_jwt_secret_dev_2026_change_in_production'
```
Como o repositório é **público**, este valor está visível a qualquer pessoa — e com ele, qualquer um consegue forjar um token JWT válido para qualquer utilizador, sem login. Voltei a pôr o comportamento de "falhar o arranque se a variável não estiver definida", porque é a única forma de garantir que isto nunca fica esquecido em produção sem seres avisado.

**Ficheiros:** `auth/auth.module.ts`, `auth/jwt.strategy.ts`.

**A tua ação:** confirma que `JWT_SECRET` está definido no painel da Vercel → Production, com um valor aleatório forte (ex: `openssl rand -base64 48`). **Sem isto, o backend volta a fazer 500 em tudo**, exatamente como viste nos logs — mas agora sabes exatamente porquê, em vez de andarmos a contornar o sintoma.

### 1.2 CORS — voltou a ser uma lista explícita, não "qualquer coisa em `.vercel.app`"

Tinhas alargado o CORS para aceitar qualquer origem terminada em `.vercel.app` ou contendo `localhost`/`fincontrol`. Isso permite que **qualquer outra aplicação hospedada na Vercel** (de qualquer pessoa) faça pedidos autenticados à tua API a partir do browser de um utilizador teu. Voltei a uma lista explícita (`ALLOWED_ORIGINS`), mas incluí `https://control-de-custos-v9ju.vercel.app` como valor por defeito de segurança, para não voltares a ficar bloqueado se esqueceres de definir a variável.

**Ficheiro:** `main.ts`.

**A tua ação:** define `ALLOWED_ORIGINS` explicitamente na Vercel de qualquer forma (não confies só no valor por defeito do código):
```
ALLOWED_ORIGINS=https://control-de-custos-v9ju.vercel.app
```

### 1.3 `/api/debug-env` e `/api/test-db` — agora exigem uma chave

Estes dois endpoints ficaram publicamente acessíveis sem autenticação. Agora só respondem se passares `?key=<DEBUG_KEY>` na URL, onde `DEBUG_KEY` é uma variável de ambiente só tua.

**Ficheiro:** `main.ts`.

**A tua ação:** define `DEBUG_KEY` na Vercel (qualquer valor secreto), e passa a aceder por exemplo a `https://control-de-custos.vercel.app/api/debug-env?key=<o-teu-valor>`. Sem a variável definida, os endpoints devolvem sempre `404`.

### 1.4 Token de verificação do webhook do WhatsApp

O mesmo padrão de fallback previsível existia aqui: `WHATSAPP_VERIFY_TOKEN || 'fincontrol_token'`. Removido — agora, se a variável não estiver definida, a verificação do webhook falha explicitamente em vez de aceitar um valor adivinhável.

**Ficheiro:** `whatsapp/whatsapp-webhook.controller.ts`.

---

## 2. Checklist Completo — O Que Falta para o Bot de WhatsApp Funcionar

Isto junta tudo o que já vimos, organizado como lista de verificação única. Percorre de cima a baixo.

### 2.1 Pré-requisito: o backend tem de arrancar sem crashar

- [ ] `JWT_SECRET` definido na Vercel (Production) — sem isto nada funciona, nem sequer login normal.
- [ ] `DATABASE_URL` (ou as variáveis `DB_*`) definidas e a apontar para a tua base de dados Neon real.
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` definidos (para o login Google continuar a funcionar).
- [ ] `ALLOWED_ORIGINS` definido com o domínio real do frontend.
- [ ] Confirma tudo isto em `https://control-de-custos.vercel.app/api/debug-env?key=<DEBUG_KEY>` — deve mostrar `true` em `hasJwtSecret`, `hasDatabaseUrl`, `hasGoogleClientId`.

### 2.2 Escolher o canal de envio: Evolution API ou Meta Cloud API

O código já suporta os dois, com a Evolution API a ter prioridade se estiver configurada. **Escolhe um dos dois caminhos abaixo — não precisas dos dois.**

#### Caminho A — Evolution API (mais rápido para começar, não exige verificação de negócio)

A Evolution API é um gateway open-source não-oficial que liga a um número de WhatsApp normal via QR code (como o WhatsApp Web), sem passar pela burocracia de verificação de negócio da Meta.

- [ ] Ter uma instância Evolution API a correr (self-hosted num serviço tipo Railway/Render, ou um provedor gerido de Evolution API).
- [ ] Ligar essa instância a um número de WhatsApp real via QR code (processo da própria Evolution API — normalmente um endpoint `/instance/connect/<nome>` que devolve o QR para escaneares com o telemóvel do número que vai ser o bot).
- [ ] Definir na Vercel: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`.
- [ ] Configurar o **webhook de saída** da própria instância Evolution API para apontar para `https://control-de-custos.vercel.app/webhooks/whatsapp` (isto configura-se do lado da Evolution API, não do Meta — normalmente em `/webhook/set/<instancia>`).
- [ ] **Risco a saber:** contas de WhatsApp normais ligadas via este tipo de gateway não-oficial podem ser banidas pela Meta se enviarem muito volume ou padrões suspeitos — é aceitável para validar o produto com poucos utilizadores, mas não é uma garantia de longo prazo à escala.

#### Caminho B — Meta WhatsApp Cloud API (oficial, mais burocrático)

- [ ] `WHATSAPP_PHONE_NUMBER_ID` — já tens (`1370747699451260`, do número de teste).
- [ ] `WHATSAPP_ACCESS_TOKEN` — **atenção:** o token que vês no ecrã "Try it out" é temporário (expira em ~24h). Para produção, gera um token permanente: Meta Business Settings → **System Users** → criar um → gerar token com a permissão `whatsapp_business_messaging`, sem expiração.
- [ ] `WHATSAPP_VERIFY_TOKEN` — define um valor teu (ex: `fincontrol_verify_2026_xyz`).
- [ ] No painel do Meta → **Step 2. Production setup → Configuration → Webhooks**:
  - Callback URL: `https://control-de-custos.vercel.app/webhooks/whatsapp`
  - Verify token: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
  - Subscrever o campo **`messages`**
- [ ] Enquanto estiveres no número de teste, só consegues enviar para números na lista de "recipient numbers" testadores — adiciona o teu próprio número lá.
- [ ] Para sair do modo de teste e falar com qualquer número: completar **Step 3. Business verification** (upload de documentos, revisão da Meta) — pode demorar dias.

### 2.3 Testar o fluxo de ponta a ponta

- [ ] Enviar `"Oi"` ao número do bot → confirmar que recebes uma resposta de boas-vindas (não só um 200 no log, a mensagem tem mesmo de chegar ao teu WhatsApp).
- [ ] Enviar `"gastei 2000 kz em táxi"` → confirmar que aparece como transação na conta associada a esse número, e que a resposta de confirmação chega.
- [ ] Enviar uma foto de recibo (se o OCR já estiver ligado) → confirmar processamento.
- [ ] Testar o fluxo de vinculação: gerar código em Definições no site → enviar `"vincular 123456"` (ou só `"123456"`) → confirmar que a mensagem seguinte (`"gastei..."`) aparece na **mesma conta** que usas no site, não numa conta nova.
- [ ] Testar o comando `"errado"` logo a seguir a um lançamento, para confirmar que o desfazer funciona.

### 2.4 Se algo falhar neste ponto

- [ ] Verifica os **Runtime Logs** da Vercel filtrados por `/webhooks/whatsapp` — deve aparecer uma entrada por cada mensagem recebida.
- [ ] Se não aparecer nada: o problema está antes de chegar ao teu servidor — confirma a configuração do webhook do lado do Meta/Evolution API (URL certa, verificação aceite).
- [ ] Se aparecer com 200 mas a mensagem não chega ao teu telemóvel: o problema é no envio de saída — confirma `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` ou `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`, e usa `/api/debug-env?key=...` para confirmar que estão mesmo definidos (sem expor os valores, só se existem).
- [ ] Se aparecer com 500: cola o log expandido aqui, tal como fizeste antes — normalmente é falta de alguma env var ou uma coluna em falta na base de dados.

---

## 3. Resumo de Variáveis de Ambiente Necessárias

| Variável | Obrigatória? | Para quê |
|---|---|---|
| `JWT_SECRET` | Sim | Login/autenticação — sem isto o backend não arranca |
| `DATABASE_URL` | Sim | Ligação à base de dados |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Sim | Login Google |
| `ALLOWED_ORIGINS` | Recomendado | CORS — sem isto usa o valor por defeito (só o teu frontend) |
| `DEBUG_KEY` | Opcional | Protege `/api/debug-env` e `/api/test-db` |
| `WHATSAPP_VERIFY_TOKEN` | Se usares Meta Cloud API | Verificação do webhook |
| `WHATSAPP_PHONE_NUMBER_ID` | Se usares Meta Cloud API | Envio de mensagens |
| `WHATSAPP_ACCESS_TOKEN` | Se usares Meta Cloud API | Envio de mensagens (usar token permanente de System User, não o temporário) |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE_NAME` | Se usares Evolution API | Envio de mensagens (alternativa não-oficial) |

---

*Depois de aplicares o zip e confirmares as variáveis de ambiente na Vercel, o passo mais rápido para saberes se está tudo certo é o `/api/debug-env?key=<a-tua-chave>` — se todos os `has*` vierem `true`, o resto é só testar o fluxo do WhatsApp de ponta a ponta como descrito na secção 2.3.*
