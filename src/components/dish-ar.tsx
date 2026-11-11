'use client';

import { useEffect, useState } from 'react';
import { Box, X } from 'lucide-react';
import { ModelViewer } from './model-viewer';

type Dims = { w: number; h: number; d: number };

const cm = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Botão "Ver na mesa" + tela com o prato em 3D e AR em tamanho real. */
export function DishAr({ name, modelUrl, iosModelUrl, image, dims }: {
  name: string;
  modelUrl: string;
  iosModelUrl?: string | null;
  image?: string | null;
  dims?: Dims | null;
}) {
  const [open, setOpen] = useState(false);
  const [canAr, setCanAr] = useState<boolean | null>(null);
  const [arFailed, setArFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => { setArFailed(false); setCanAr(null); setOpen(true); }} className="btn-secondary mt-4 w-full sm:w-auto">
        <Box className="h-4 w-4" /> Ver na mesa
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`${name} em 3D`} className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-t-3xl bg-surface p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-extrabold tracking-tight">{name}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-ink/5" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>

            <div className="relative">
              <ModelViewer
                src={modelUrl}
                iosSrc={iosModelUrl}
                poster={image}
                alt={`${name} em 3D`}
                height="min(60vh, 420px)"
                onArSupport={setCanAr}
                onArFailed={() => setArFailed(true)}
              />
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-muted">
              {canAr === false && <p className="font-medium text-ink">Abra no celular para ver o prato na sua mesa.</p>}
              {canAr !== false && <p>Toque no botão e aponte a câmera para a mesa.</p>}
              {arFailed && <p className="font-medium text-danger">A câmera não abriu. Verifique a permissão e tente de novo.</p>}
              {dims && <p>Tamanho real: {cm(dims.w)} cm de largura · {cm(dims.h)} cm de altura</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
