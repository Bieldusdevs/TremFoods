import { NextResponse } from 'next/server';
import { requireUser } from '@/domains/account/session';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
    include: { category: { select: { name: true } } },
  });
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category.name,
      priceCents: p.priceCents,
      available: p.available,
    })),
  });
}
