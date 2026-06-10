# T91 Mission Control

Painel operacional privado para acompanhar a saude do ecossistema T91.

## Objetivo

O Mission Control deve responder rapidamente:

- o ecossistema esta saudavel agora?
- existe algo aguardando Tony?
- algum cron, gateway, agente, sync ou VPS precisa de atencao?
- quais sinais recentes merecem investigacao?

O painel nasce como camada de inteligencia e auditoria. Por padrao, ele deve ser
read-only. Acoes criticas, externas, financeiras, destrutivas ou que afetem
terceiros continuam exigindo aprovacao explicita.

## URL

- Producao: `https://ops.t91.com.br`

## Estado Atual

- Base visual: Builderz adaptado.
- Autenticacao: login interno do app.
- Status: em transicao de painel generico para cockpit operacional T91.
- Fonte de dados: ainda em consolidacao. Qualquer dado parcial deve aparecer
  como `snapshot`, `stale`, `mock` ou `not connected`.

## Principios

- O Overview deve ser triagem executiva, nao diagnostico tecnico completo.
- A aba Monitor continua sendo o lugar de investigacao detalhada.
- Nenhum card deve parecer confiavel se a fonte de dados nao estiver conectada.
- Secrets ficam fora do repo, via environment/1Password.
- Alteracoes devem passar por commit antes de deploy.

## Roadmap Inicial

- Overview: status do ecossistema, tarefas, VPS compacto, sinais recentes.
- Tasks: espelhar o ledger/pending operacional com clareza de fonte e freshness.
- Monitor VPS: evoluir de snapshot simples para observabilidade acionavel.
- Agents/Sessions: mostrar agentes reais, nao herdados do Builderz.
- Logs/Signals: consolidar eventos relevantes, falhas e alertas vermelhos.

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Estrutura

```text
docs/
  ARCHITECTURE.md
  ROADMAP.md
```

O codigo do app sera conectado a este repo depois da auditoria do estado atual
em producao.
