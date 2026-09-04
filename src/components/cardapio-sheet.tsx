'use client';

import Link from 'next/link';
import { Timer } from 'lucide-react';

import { useState, useEffect } from 'react';

/**
 * Faixa fina de horário/estado da loja (não é um elemento de marketing —
 * é informação operacional real: "Aberto / fecha" baseado no horário).
 */
export function CardapioSheet() {
  const [info, setInfo] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      // Todos os dias, 06h30 – 00h00
      const open = mins >= 390 && mins < 1440;
      setInfo(open ? { open: true, label: 'Aberto agora · fecha às 00h00' } : { open: false, label: 'Fechado · abre às 06h30' });
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!info) return null;
  return (
    <div className="hidden items-center gap-2 px-6 py-2 text-xs text-muted lg:flex">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${info.open ? 'bg-success' : 'bg-danger'}`} />
      {info.label}
      <span className="text-line">|</span>
      <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> Entrega 40 min · Levantamento 20 min</span>
      <span className="text-line">|</span>
      <Link href="/rastreamento" className="underline-offset-2 hover:underline">Acompanhar pedido</Link>
    </div>
  );
}
