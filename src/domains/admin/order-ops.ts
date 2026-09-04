import { prisma } from '@/infra/db';
import { safeAdvanceStatus } from '@/domains/orders/order-status';

// Lista de trabalho do balcão: até 100 pedidos recentes, com filtro opcional por estado.
export function listOrders(status?: string) {
  return prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' as const },
    take: 100,
    include: { items: true, user: { select: { email: true } } },
  });
}

export function moveOrderStatus(orderId: string, next: string) {
  return safeAdvanceStatus(orderId, next);
}
