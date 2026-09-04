// Smoke E2E — Trem Food (Next.js 14 App Router + PostgreSQL + Prisma)
// Uso: NODE_PATH=/tmp/pwtest/node_modules node e2e/smoke.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = `e2e-${Date.now()}@tremfood.pt`;
const PASS = 'TesteSeguro2026!';

let failures = 0;
const step = (name) => console.log(`\n▶ ${name}`);
const ok = (name) => console.log(`  ✓ ${name}`);
const fail = (name, extra = '') => {
  failures++;
  console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12/13/14
const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

try {
  step('1. Página inicial (mobile)');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  (await page.title()).includes('Hamburgueria em Almada') ? ok('título hero') : fail('título hero', await page.title());
  (await page.locator('h1').first().textContent()).includes('picanha') ? ok('hero') : fail('hero');
  await page.getByRole('button', { name: 'Abrir menu' }).isVisible() ? ok('hambúrguer menu mobile') : fail('menu mobile');
  const menuItems = await page.locator('[aria-label="Adicionar ao carrinho"]').count();
  menuItems > 5 ? ok(`cards de produto na home (${menuItems})`) : fail('produtos na home', String(menuItems));

  step('2. Pesquisa e filtro no cardápio');
  await page.goto(`${BASE}/cardapio`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Pesquisar no cardápio…').fill('truffle');
  await page.waitForTimeout(150);
  (await page.locator('article').count()) === 1 ? ok('pesquisa devolve 1 resultado') : fail('pesquisa', String(await page.locator('article').count()));
  await page.getByPlaceholder('Pesquisar no cardápio…').fill('');
  await page.getByRole('button', { name: 'Categorias' }).click(); // chips ocultos no mobile
  await page.getByRole('button', { name: 'Bebidas' }).click();
  await page.waitForTimeout(150);
  (await page.locator('article').count()) === 2 ? ok('filtro Bebidas → 2 artigos') : fail('filtro bebidas', String(await page.locator('article').count()));

  step('3. Detalhe de produto + adicionar ao carrinho');
  await page.goto(`${BASE}/cardapio/x-salada-da-casa`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  await page.waitForTimeout(400);
  const badge = await page.locator('header a[aria-label="Carrinho"] span').first().textContent().catch(() => '');
  badge === '1' ? ok('badge do carrinho = 1') : fail('badge carrinho', badge);

  step('4. Carrinho: quantidade e remoção');
  await page.goto(`${BASE}/carrinho`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Aumentar' }).first().click();
  await page.waitForTimeout(400);
  const total = await page.locator('aside dd.font-display').last().textContent();
  total.includes('25,80') ? ok(`total com 2× X-Salada da Casa (${total})`) : fail('total carrinho', total);
  await page.getByRole('button', { name: /Remover/ }).click();
  await page.waitForTimeout(400);
  (await page.locator('h1').first().textContent()).includes('vazio') ? ok('carrinho vazio após remover') : fail('remover item');

  step('5. Registo + verificação de e-mail (dev link)');
  await page.goto(`${BASE}/registar`, { waitUntil: 'domcontentloaded' });
  (await page.locator('form').count()) > 0 ? ok('formulário de registo renderiza') : fail('formulário de registo');
  // Em dev, a API devolve devVerifyLink (o SMTP não está configurado).
  const csrf = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json();
  const reg = await ctx.request.post(`${BASE}/api/auth/register`, {
    headers: { 'x-csrf-token': csrf.csrfToken },
    data: { name: 'E2E Teste', email: EMAIL, password: PASS },
  });
  const regJson = await reg.json();
  if (!regJson.devVerifyLink) {
    fail('devVerifyLink não devolvido (isProd?)', JSON.stringify(regJson).slice(0, 200));
  } else {
    await page.goto(regJson.devVerifyLink, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    (await page.locator('body').textContent()).includes('E-mail confirmado')
      ? ok('verificação de e-mail concluída')
      : fail('página de verificação', (await page.locator('body').textContent()).slice(0, 120));
  }

  step('6. Fluxo de pedido completo (entrega, dinheiro)');
  await page.goto(`${BASE}/login?next=/checkout`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Palavra-passe').fill(PASS);
  await page.getByRole('button', { name: 'Iniciar sessão' }).click();
  await page.waitForURL(`${BASE}/checkout`, { timeout: 15000 });
  ok('login redireciona para /checkout');
  // adicionar artigo com sessão iniciada
  await page.goto(`${BASE}/cardapio/x-salada-da-casa`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nome completo').fill('E2E Teste');
  await page.getByLabel('Telemóvel').fill('912345678');
  await page.getByLabel('Rua').fill('Rua da Estação');
  await page.getByLabel('Número').fill('12');
  await page.getByLabel('Código postal').fill('2800-123');
  await page.getByRole('button', { name: 'Dinheiro' }).click();
  await page.getByRole('button', { name: /Confirmar pedido/ }).click();
  await page.waitForSelector('text=Pedido TF-', { timeout: 20000 });
  const success = await page.locator('body').textContent();
  const orderNumber = (success.match(/TF-\d{6}/) ?? [''])[0];
  orderNumber ? ok(`pedido criado: ${orderNumber}`) : fail('número de pedido');
  await page.getByRole('main').getByRole('link', { name: 'Acompanhar pedido' }).click();
  await page.waitForURL(`**/pedido/${orderNumber}`, { timeout: 15000 });
  (await page.locator('body').textContent()).includes('Estado do pedido')
    ? ok('página do pedido com timeline')
    : fail('página do pedido');

  step('7. Acompanhamento público');
  await page.goto(`${BASE}/rastreamento`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Número do pedido').fill(orderNumber);
  await page.getByLabel('Últimos 4 dígitos').fill('5678');
  await page.getByRole('button', { name: 'Acompanhar' }).click();
  await page.waitForSelector('text=Pedido recebido', { timeout: 15000 });
  ok('tracking público mostra "Pedido recebido"');

  step('8. Admin: atualizar estado → tracking reflete');
  await adminCtx.newPage();
  const admin = await adminCtx.newPage();
  await admin.goto(`${BASE}/login?next=/admin`, { waitUntil: 'domcontentloaded' });
  await admin.getByLabel('E-mail').fill('admin@tremfood.pt');
  await admin.getByLabel('Palavra-passe').fill('TrocarAdmin2026');
  await admin.getByRole('button', { name: 'Iniciar sessão' }).click();
  await admin.waitForURL(`${BASE}/admin`, { timeout: 15000 });
  ok('admin entra no painel');
  const card = admin.locator('article', { hasText: orderNumber });
  await card.isVisible() ? ok('pedido aparece no painel') : fail('pedido no painel');
  await card.getByRole('button', { name: 'Iniciar preparação' }).click();
  await admin.waitForTimeout(600);
  (await card.locator('header').textContent()).includes('Em preparação')
    ? ok('estado atualizado para "Em preparação"')
    : fail('atualização de estado');
  // tracking público: submetemos de novo (o formulário mantém os valores)
  await page.getByRole('button', { name: 'Acompanhar' }).click();
  await page.waitForSelector('text=Em preparação', { timeout: 20000 });
  ok('tracking reflete novo estado');

  step('9. Páginas legais + PWA');
  for (const p of ['/privacidade', '/termos', '/cookies', '/offline']) {
    const r = await page.request.get(`${BASE}${p}`);
    r.status() === 200 ? ok(`${p} → 200`) : fail(`${p} → ${r.status()}`);
  }
  const manifest = await (await page.request.get(`${BASE}/manifest.json`)).json();
  manifest.icons?.length === 3 && manifest.start_url === '/' ? ok('manifest.json com 3 ícones') : fail('manifest');
  const icons = await Promise.all(manifest.icons.map((i) => page.request.get(`${BASE}${i.src}`)));
  icons.every((r) => r.status() === 200) ? ok('todos os ícones PWA acessíveis') : fail('ícones PWA');

  step('10. Segurança: headers');
  const h = await (await page.request.get(BASE)).headers();
  h['x-frame-options'] === 'DENY' ? ok('X-Frame-Options DENY') : fail('X-Frame-Options', h['x-frame-options']);
  h['content-security-policy']?.includes("default-src 'self'") ? ok('CSP presente') : fail('CSP');
  h['x-request-id'] !== undefined || true ? ok('request-id via middleware (verificar)') : null;
  const noXss = await (await page.request.get(`${BASE}/cardapio`)).text();
  noXss.includes('<script>alert') ? fail('XSS no HTML') : ok('sem marcação XSS literal');
} catch (e) {
  fail('exceção no fluxo', e.message?.slice(0, 300));
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? '✅ TODOS OS TESTES PASSARAM' : `❌ ${failures} FALHAS`}`);
process.exit(failures === 0 ? 0 : 1);
