import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Menu real da casa (fonte: menu e destaques do negócio).
 * Fotografias reais do estabelecimento em /img/items/real-*.jpg.
 */
const categories = [
  { name: 'Hambúrgueres', slug: 'hamburgueres', description: 'X-salada, bacon e smash — pão macio e carne na chapa.', sort: 1 },
  { name: 'Petiscos', slug: 'petiscos', description: 'Torresmo, kibe e petiscos para partilhar, com cerveja gelada.', sort: 2 },
  { name: 'Pratos', slug: 'pratos', description: 'Pratos completos: picanha, arroz, fritas e salada.', sort: 3 },
  { name: 'Sobremesas', slug: 'sobremesas', description: 'Taças de chocolate e creme feitas na loja.', sort: 4 },
  { name: 'Acompanhamentos', slug: 'acompanhamentos', description: 'Fritas, anéis de cebola e molhos.', sort: 5 },
  { name: 'Bebidas', slug: 'bebidas', description: 'Milkshakes e bebidas frescas.', sort: 6 },
];

const products = [
  // ── Hambúrgueres
  { slug: 'x-salada-da-casa', name: 'X-Salada da Casa', category: 'hamburgueres', priceCents: 1290, image: '/img/items/real-x-salada.jpg', isFeatured: true, isNew: true,
    description: 'Carne 160 g na chapa, queijo derretido, alface, tomate e maionese da casa no pão com sementes. Com fritas.' },
  { slug: 'x-frango-da-casa', name: 'X-Frango da Casa', category: 'hamburgueres', priceCents: 990, image: '/img/items/real-x-frango.jpg', isNew: true,
    description: 'Frango grelhado suculento, queijo, maionese caseira e alface. Com fritas.' },
  { slug: 'barbecue-bacon', name: 'Barbecue Bacon', category: 'hamburgueres', priceCents: 1490, image: '/img/items/real-bacon-bbq.jpg', isFeatured: true,
    description: 'Carne 160 g, bacon estaladiço, molho barbecue defumado e queijo derretido.' },
  { slug: 'double-smash-classico', name: 'Double Smash Clássico', category: 'hamburgueres', priceCents: 1090, image: '/img/items/double-smash.jpg',
    description: 'Duas carnes smash, queijo prato, picles caseiros e molho especial da casa.' },
  { slug: 'dry-aged-45', name: 'Dry Aged 45', category: 'hamburgueres', priceCents: 1290, image: '/img/items/dry-aged.jpg',
    description: 'Blend maturado 45 dias em câmara seca, crosta de sal e maionese de alho negro.' },
  { slug: 'truffle-noir', name: 'Truffle Noir', category: 'hamburgueres', priceCents: 1690, image: '/img/items/truffle-noir.jpg', isFeatured: true,
    description: 'Blend angus, gruyère de 12 meses, aioli de trufa negra e lascas de trufa.' },
  { slug: 'verde-vanguard', name: 'Verde Vanguard', category: 'hamburgueres', priceCents: 990, image: '/img/items/verde-vanguard.jpg', isVegetarian: true, isFeatured: true,
    description: 'Burger de ervilha e ervas frescas, abacate, tomate confit e maionese de manjericão.' },
  { slug: 'quinoa-fire', name: 'Quinoa Fire', category: 'hamburgueres', priceCents: 890, image: '/img/items/quinoa-fire.jpg', isVegetarian: true, isSpicy: true,
    description: 'Crispy de quinoa e feijão preto, jalapeño em conserva e maionese picante defumada.' },
  { slug: 'funghi-portobello', name: 'Funghi Portobello', category: 'hamburgueres', priceCents: 950, image: '/img/items/funghi-brasa.jpg', isVegetarian: true,
    description: 'Portobello grelhado no carvão, provolone derretido, rúcula e maionese de alho negro.' },
  // ── Petiscos
  { slug: 'torresmo-crocante', name: 'Torresmo Crocante', category: 'petiscos', priceCents: 590, image: '/img/items/real-torresmo.jpg', isNew: true,
    description: 'Torresmo de barriga de porco crocante, servido com lima e alface.' },
  { slug: 'kibe-crocante', name: 'Kibe Crocante', category: 'petiscos', priceCents: 450, image: '/img/items/real-kibe.jpg', isNew: true,
    description: 'Kibe frito até ficar estaladiço, com molho agridoce da casa.' },
  // ── Pratos
  { slug: 'picanha-com-ovo-frito', name: 'Picanha com Ovo Frito', category: 'pratos', priceCents: 1290, image: '/img/items/real-picanha.jpg', isNew: true,
    description: 'Picanha fatiada com fritas douradas, arroz solto e ovo frito.' },
  // ── Sobremesas
  { slug: 'taca-chocolate-e-creme', name: 'Taça de Chocolate e Creme', category: 'sobremesas', priceCents: 450, image: '/img/items/real-taca-chocolate.jpg', isNew: true,
    description: 'Camadas de chocolate, creme de baunilha, natas e calda de chocolate.' },
  // ── Acompanhamentos
  { slug: 'batatas-rusticas', name: 'Batatas Rústicas', category: 'acompanhamentos', priceCents: 490, image: '/img/items/ember-fries.jpg',
    description: 'Batatas com pele, páprica defumada e cobertura de queijo derretido.' },
  { slug: 'onion-rings', name: 'Onion Rings', category: 'acompanhamentos', priceCents: 450, image: '/img/items/onion-rings.jpg',
    description: 'Anéis de cebola em massa de cerveja escura com maionese de chipotle.' },
  // ── Bebidas
  { slug: 'milkshake-caramelo', name: 'Milkshake de Caramelo', category: 'bebidas', priceCents: 690, image: '/img/items/bourbon-shake.jpg',
    description: 'Milkshake de caramelo salgado com chantilly torrado e fios de caramelo.' },
  { slug: 'cola-artesanal', name: 'Cola Artesanal', category: 'bebidas', priceCents: 390, image: '/img/items/smoked-cola.jpg',
    description: 'Cola artesanal com limão siciliano, laranja e gelo em cubos grandes.' },
];

async function main() {
  console.log('Seed: categorias e produtos…');
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }
  const cats = await prisma.category.findMany();
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  for (const [i, p] of products.entries()) {
    const { category, ...data } = p;
    const payload = { ...data, sort: i + 1, categoryId: bySlug[category] };
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: payload,
      create: payload,
    });
  }
  // Artigos antigos que deixaram de fazer parte do menu: ficam indisponíveis
  // para novas encomendas (os pedidos antigos continuam com referência válida).
  await prisma.product.updateMany({
    where: { slug: { notIn: products.map((p) => p.slug) } },
    data: { available: false },
  });
  await prisma.counter.upsert({ where: { id: 1 }, update: {}, create: { id: 1, value: 0 } });

  const email = process.env.ADMIN_EMAIL || 'admin@tremfood.pt';
  const password = process.env.ADMIN_PASSWORD || 'TrocarAdmin2026';
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: { name: 'Administração', email, passwordHash: hash, role: 'ADMIN', emailVerifiedAt: new Date() },
  });
  console.log('Seed concluído.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
