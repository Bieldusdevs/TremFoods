import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/infra/db';
import { log } from '@/infra/logging';

type Tx = Prisma.TransactionClient;

export type BasketSnapshot = {
  id: string;
  items: {
    id: string;
    qty: number;
    product: { id: string; name: string; priceCents: number; image: string; slug: string; description: string; available: boolean };
  }[];
};

export async function loadBasket(userId: string | null, sessionToken: string | null): Promise<BasketSnapshot> {
  if (!userId && !sessionToken) return { id: '', items: [] };
  const include = {
    items: { include: { product: { select: { id: true, name: true, priceCents: true, image: true, slug: true, description: true, available: true } } }, orderBy: { id: 'asc' as const } },
  };
  const cart = (userId
    ? await prisma.cart.findUnique({ where: { userId }, include })
    : await prisma.cart.findUnique({ where: { sessionToken: sessionToken ?? undefined }, include })) as BasketSnapshot | null;
  return cart ?? { id: '', items: [] };
}

export function summarizeBasket(cart: { items: { qty: number; product: { priceCents: number } }[] }) {
  const subtotal = cart.items.reduce((sum, i) => sum + i.product.priceCents * i.qty, 0);
  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);
  return { subtotalCents: subtotal, count };
}

async function findOrCreateCart(userId: string | null, sessionToken: string | null, tx?: Tx) {
  const client = (tx ?? prisma) as PrismaClient;
  if (userId) {
    const existing = await client.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return client.cart.create({ data: { userId } });
  }
  if (sessionToken) {
    const existing = await client.cart.findUnique({ where: { sessionToken } });
    if (existing) return existing;
    return client.cart.create({ data: { sessionToken } });
  }
  throw Object.assign(new Error('Sessão de carrinho ausente'), { status: 400 });
}

export async function addItem(userId: string | null, sessionToken: string | null, productId: string, qty: number) {
  const cart = await findOrCreateCart(userId, sessionToken);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: Math.min(30, existing.qty + qty) } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, qty } });
  }
}

export async function setItemQuantity(userId: string | null, sessionToken: string | null, productId: string, qty: number) {
  const cart = await findOrCreateCart(userId, sessionToken);
  if (qty <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return;
  }
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { qty } });
  else await prisma.cartItem.create({ data: { cartId: cart.id, productId, qty } });
}

export async function clearBasket(userId: string | null, sessionToken: string | null) {
  const cart = userId
    ? await prisma.cart.findUnique({ where: { userId } })
    : sessionToken
      ? await prisma.cart.findUnique({ where: { sessionToken } })
      : null;
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

/** Ao entrar, junta o carrinho da sessão anónima ao carrinho do utilizador. */
export async function absorbGuestBasket(userId: string, sessionToken: string | null) {
  if (!sessionToken) return;
  const guestCart = await prisma.cart.findUnique({ where: { sessionToken }, include: { items: true } });
  if (!guestCart?.items.length) return;
  const userCart = await findOrCreateCart(userId, null);
  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: userCart.id, productId: item.productId } } });
    if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: Math.min(30, existing.qty + item.qty) } });
    else await prisma.cartItem.create({ data: { cartId: userCart.id, productId: item.productId, qty: item.qty } });
  }
  await prisma.cart.deleteMany({ where: { sessionToken } });
  log('info', 'cart.merged', { userId, items: guestCart.items.length });
}

