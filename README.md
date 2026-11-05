# Trem Food — Hamburgueria em Almada

Plataforma de e-commerce e encomendas para a Trem Food: cardápio, carrinho, checkout
com pagamentos portugueses, acompanhamento de pedidos em tempo real e painel de gestão.

Stack: **Next.js 14 (App Router) + React + TypeScript + Tailwind CSS**, **PostgreSQL + Prisma**,
**Redis (opcional, rate limiting)**, **Stripe** (cartão, MB WAY, Multibanco), nodemailer.
Pronto para deploy na Vercel.

## Funcionalidades

- Cardápio com pesquisa, filtros por categoria e fichas de produto (alergénios, tempos)
- Carrinho persistente (guest, 90 dias) com fusão na conta ao iniciar sessão
- Checkout: entrega (2,50 €, grátis ≥ 25 €) ou levantamento; dinheiro, cartão, MB WAY,
  referência Multibanco (Stripe); nota para a cozinha
- Pedidos com número único sequencial (`TF-000001`), estado em tempo real
  (Recebido → Em preparação → Saiu para entrega → Entregue / Cancelado) e linha do tempo
- Acompanhamento público por número + últimos 4 dígitos do telemóvel
- Contas: registo, verificação de e-mail, início de sessão, recuperação de palavra-passe,
  gestão de sessões (terminar outras / todas)
- Painel de administração com atualização de estados (refletida no cliente em segundos)
- Gestão completa do cardápio no admin: produtos (foto por URL, descrição, preço, flags, disponibilidade),
  categorias e adicionais por grupos (obrigatório/múltiplo, opções com preço extra; validados no servidor)
- PWA instalável (manifest + service worker com cache e atualização automática), SEO completo
  (sitemap, robots, llms.txt, Open Graph, schema.org), segurança (CSP, CSRF, rate limiting,
  sanitação, auditoria)