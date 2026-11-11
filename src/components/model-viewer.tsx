'use client';

import { useEffect, useRef, useState } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

type Props = {
  src: string;
  iosSrc?: string | null;
  poster?: string | null;
  alt: string;
  /** Mostra o botão "Ver na minha mesa" (AR). No editor do admin fica desligado. */
  ar?: boolean;
  height?: number | string;
  onLoad?: (el: ModelViewerElement) => void;
  onElement?: (el: ModelViewerElement | null) => void;
  onArFailed?: () => void;
  onArSupport?: (supported: boolean) => void;
};

/**
 * <model-viewer> carregado sob demanda (~1,1 MB): só entra no bundle quando
 * alguém abre o prato em 3D, nunca na página inicial.
 */
export function ModelViewer({ src, iosSrc, poster, alt, ar = true, height = 360, onLoad, onElement, onArFailed, onArSupport }: Props) {
  const [ready, setReady] = useState(false);
  const ref = useRef<ModelViewerElement | null>(null);
  const cb = useRef({ onLoad, onElement, onArFailed, onArSupport });
  cb.current = { onLoad, onElement, onArFailed, onArSupport };

  useEffect(() => {
    let alive = true;
    import('@google/model-viewer').then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;
    cb.current.onElement?.(el);
    const handleLoad = () => {
      cb.current.onLoad?.(el);
      cb.current.onArSupport?.(Boolean(el.canActivateAR));
    };
    const handleAr = (e: Event) => {
      if ((e as CustomEvent<{ status: string }>).detail?.status === 'failed') cb.current.onArFailed?.();
    };
    el.addEventListener('load', handleLoad);
    el.addEventListener('ar-status', handleAr);
    return () => {
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('ar-status', handleAr);
      cb.current.onElement?.(null);
    };
  }, [ready, src]);

  const box = { width: '100%', height, borderRadius: 16, overflow: 'hidden', background: '#EFECE5' } as const;

  // Foto enquanto o 3D carrega: nunca deixa um bloco vazio, que parece defeito.
  if (!ready) {
    return (
      <div style={box} className="relative flex items-center justify-center">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="relative rounded-full bg-surface/90 px-3 py-1 text-xs font-medium">Carregando o prato em 3D…</span>
      </div>
    );
  }

  return (
    <model-viewer
      ref={ref}
      src={src}
      ios-src={iosSrc ?? undefined}
      poster={poster ?? undefined}
      alt={alt}
      ar={ar ? true : undefined}
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls
      touch-action="pan-y"
      auto-rotate
      auto-rotate-delay={0}
      rotation-per-second="20deg"
      interaction-prompt="none"
      camera-orbit="30deg 68deg 115%"
      shadow-intensity="1"
      environment-image="neutral"
      exposure="1.05"
      style={box}
    >
      {ar && (
        <button
          slot="ar-button"
          type="button"
          className="btn-primary"
          style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)' }}
        >
          Ver na minha mesa
        </button>
      )}
    </model-viewer>
  );
}
