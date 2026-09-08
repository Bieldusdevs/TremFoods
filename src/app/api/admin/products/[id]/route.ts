import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ available: z.boolean() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }

  const body = await parseJson(req);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: { available: parsed.data.available },
    select: { id: true, name: true, available: true },
  }).catch(() => null);
  if (!product) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Produto não encontrado.' } }, { status: 404 });
  }
  await audit('admin.product.availability', req, user.id, user.email, { productId: product.id, name: product.name, available: product.available });
  log('info', 'admin.product.availability', { productId: product.id, available: product.available });
  return NextResponse.json({ ok: true, product });
}
