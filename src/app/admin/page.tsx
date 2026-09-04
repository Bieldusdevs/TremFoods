import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AdminOrders } from './admin-orders';
import { requireUser } from '@/domains/account/session';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { eur, dateTimePT } from '@/domains/shared-kernel/money';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Painel de gestão',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const { user } = await requireUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/');

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true, user: { select: { email: true } } },
  });

  return (
    <div className="container-app py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Painel de gestão</h1>
          <p className="mt-1 text-sm text-muted">Estafeta e cozinha — atualize o estado para o cliente acompanhar em tempo real.</p>
        </div>
        <span className="chip bg-ink/5 text-sm">{orders.length} pedidos</span>
      </div>
      <AdminOrders initial={orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        deliveryMethod: (o.deliveryMethod as 'DELIVERY' | 'PICKUP'),
        totalCents: o.totalCents,
        totalLabel: eur(o.totalCents),
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail ?? o.user.email,
        note: o.note,
        addressLine: o.deliveryMethod === 'DELIVERY' ? [o.addressStreet, o.addressNumber, o.addressCity, o.addressPostal].filter(Boolean).join(', ') : 'Levantamento no balcão',
        items: o.items.map((i) => ({ name: i.nameSnapshot, qty: i.qty })),
        createdAt: o.createdAt.toISOString(),
      }))} />
    </div>
  );
}
