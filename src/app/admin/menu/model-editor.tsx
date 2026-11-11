'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { RotateCw, Trash2, Upload as UploadIcon, Info } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import type { ModelViewerElement } from '@google/model-viewer';
import { ModelViewer } from '@/components/model-viewer';
import { getCsrf } from '@/infra/http-client';
import type { Upright } from '@/lib/glb';

export type Dims = { w: number; h: number; d: number };
export type ModelFields = { modelUrl: string | null; iosModelUrl: string | null; dims: Dims | null; image: string };
export type ModelEditorHandle = { commit: (image: string, slug: string) => Promise<ModelFields> };

const MAX_BYTES = 50 * 1024 * 1024;
const TYPES: Record<string, string> = {
  usdz: 'model/vnd.usdz+zip',
  glb: 'model/gltf-binary',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

async function uploadFile(file: Blob, name: string): Promise<string> {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const csrf = await getCsrf();
  const res = await upload(`modelos/${name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/models/upload',
    clientPayload: csrf,
    contentType: TYPES[ext] ?? 'application/octet-stream',
    multipart: file.size > 5 * 1024 * 1024,
  });
  return res.url;
}

export const ModelEditor = forwardRef<
  ModelEditorHandle,
  { name: string; value: ModelFields; onChange: (patch: Partial<ModelFields>) => void }
>(function ModelEditor({ name, value, onChange }, ref) {
  const [pendingGlb, setPendingGlb] = useState<Blob | null>(null);
  const [pendingUsdz, setPendingUsdz] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value.modelUrl);
  const [up, setUp] = useState<Upright>({ x: 0, z: 0 });
  const [widthCm, setWidthCm] = useState('');
  const [adjusted, setAdjusted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const source = useRef<ArrayBuffer | null>(null);
  const scene = useRef<unknown>(null);
  const viewer = useRef<ModelViewerElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const latest = useRef({ value, pendingGlb, pendingUsdz });
  latest.current = { value, pendingGlb, pendingUsdz };

  const showBlob = (blob: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl.current);
  };
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function resetLocal(url: string | null) {
    source.current = null;
    scene.current = null;
    setPendingGlb(null);
    setPendingUsdz(null);
    setUp({ x: 0, z: 0 });
    setAdjusted(false);
    setWidthCm('');
    setPreviewUrl(url);
    setError(null);
  }

  const onPickGlb = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!/\.glb$/i.test(file.name)) return setError('Envie um arquivo .glb.');
    if (file.size > MAX_BYTES) return setError('O arquivo passa de 50 MB. Exporte o escaneamento com qualidade menor.');
    resetLocal(null);
    source.current = await file.arrayBuffer();
    setPendingGlb(file);
    showBlob(file);
  };

  const ensureSource = async () => {
    if (source.current) return source.current;
    if (!value.modelUrl) throw new Error('Envie o modelo primeiro.');
    const r = await fetch(value.modelUrl);
    if (!r.ok) throw new Error('Não foi possível ler o modelo para ajustar.');
    source.current = await r.arrayBuffer();
    return source.current;
  };

  const applyAdjust = async (nextUp: Upright, width: string) => {
    setError(null);
    setBusy(true);
    try {
      const w = Number(width.replace(',', '.'));
      if (!(w > 0)) throw new Error('Informe a largura real do prato em cm.');
      const buf = await ensureSource();
      const { loadScene, placeAtRealSize } = await import('@/lib/glb');
      if (!scene.current) scene.current = await loadScene(buf);
      const out = placeAtRealSize(buf, scene.current as Parameters<typeof placeAtRealSize>[1], w, nextUp);
      const blob = new Blob([out.glb], { type: 'model/gltf-binary' });
      setPendingGlb(blob);
      setAdjusted(true);
      showBlob(blob);
      onChange({ dims: out.dims });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ajustar o modelo.');
    } finally {
      setBusy(false);
    }
  };

  const rotate = (axis: 'x' | 'z') => {
    const next = { ...up, [axis]: (up[axis] + 1) % 4 };
    setUp(next);
    void applyAdjust(next, widthCm || String(value.dims?.w ?? ''));
  };

  // Medidas automáticas: o model-viewer devolve metros; guardamos em cm.
  const onViewerLoad = useCallback(
    (el: ModelViewerElement) => {
      const s = el.getDimensions();
      const r = (v: number) => Math.round(v * 1000) / 10;
      onChange({ dims: { w: r(s.x), h: r(s.y), d: r(s.z) } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useImperativeHandle(ref, () => ({
    async commit(image, slug) {
      const { value: v, pendingGlb: glb, pendingUsdz: usdz } = latest.current;
      const base =
        (slug || name || 'prato')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'prato';
      const out: ModelFields = { ...v, image };
      if (glb) out.modelUrl = await uploadFile(glb, `${base}.glb`);
      if (usdz) out.iosModelUrl = await uploadFile(usdz, `${base}.usdz`);
      // Foto do cartão automática: só quando o prato ainda não tem foto.
      if (out.modelUrl && !out.image && viewer.current) {
        const blob = await viewer.current.toBlob({ mimeType: 'image/webp', qualityArgument: 0.86, idealAspect: true });
        out.image = await uploadFile(new File([blob], 'foto.webp', { type: 'image/webp' }), `${base}-foto.webp`);
      }
      setPendingGlb(null);
      setPendingUsdz(null);
      return out;
    },
  }));

  const hasModel = Boolean(previewUrl);

  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold">Modelo 3D / realidade aumentada</p>
          <p className="text-xs text-muted">
            O cliente vê o prato em 3D e coloca em tamanho real sobre a mesa pela câmera do celular.
          </p>
        </div>
        <button type="button" onClick={() => setShowHelp((s) => !s)} className="btn-ghost shrink-0 text-xs">
          <Info className="h-3.5 w-3.5" /> Como escanear
        </button>
      </div>

      {showHelp && (
        <ol className="mt-3 list-decimal space-y-1 rounded-xl bg-surface p-3 pl-6 text-xs text-muted">
          <li>
            Instale o app <b>Scaniverse</b> (grátis, iPhone e Android). Escaneie o prato com luz suave, parado num fundo liso: uma volta na
            altura do prato e outra mais de cima. Recorte a mesa antes de exportar.
          </li>
          <li>
            Exporte em <b>GLB</b>. Se passar de 50 MB, exporte com qualidade menor.
          </li>
          <li>Envie o .glb aqui. O escaneamento já vem em tamanho real; confira as medidas abaixo com o prato de verdade.</li>
          <li>Dica: escaneie logo depois de montar o prato, antes do queijo escorrer e sem vapor.</li>
        </ol>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="m-glb">
            Arquivo .glb (até 50 MB)
          </label>
          <input id="m-glb" type="file" accept=".glb,model/gltf-binary" className="input" onChange={(e) => onPickGlb(e.target.files?.[0])} />
        </div>
        <div>
          <label className="label" htmlFor="m-usdz">
            Arquivo .usdz (opcional)
          </label>
          <input id="m-usdz" type="file" accept=".usdz" className="input" onChange={(e) => setPendingUsdz(e.target.files?.[0] ?? null)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="m-url">
            ou URL do modelo
          </label>
          <input
            id="m-url"
            className="input"
            placeholder="https://…/prato.glb"
            value={pendingGlb ? '' : value.modelUrl ?? ''}
            disabled={Boolean(pendingGlb)}
            onChange={(e) => {
              resetLocal(e.target.value || null);
              onChange({ modelUrl: e.target.value || null });
            }}
          />
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

      {hasModel && (
        <div className="mt-4 space-y-3">
          <ModelViewer
            src={previewUrl!}
            alt={`${name || 'Prato'} em 3D`}
            poster={value.image || undefined}
            ar={false}
            height={280}
            onElement={(el) => {
              viewer.current = el;
            }}
            onLoad={onViewerLoad}
          />

          {value.dims && (
            <p className="text-sm font-medium">
              Tamanho real: {fmt(value.dims.w)} × {fmt(value.dims.h)} × {fmt(value.dims.d)} cm
            </p>
          )}
          <p className="text-xs text-muted">
            O modelo precisa estar em escala real (1 unidade = 1 metro). Confira se as medidas batem com o prato.
          </p>

          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3">
            <button type="button" disabled={busy} onClick={() => rotate('x')} className="btn-secondary text-xs">
              <RotateCw className="h-3.5 w-3.5" /> Girar para frente ↻
            </button>
            <button type="button" disabled={busy} onClick={() => rotate('z')} className="btn-secondary text-xs">
              <RotateCw className="h-3.5 w-3.5" /> Girar de lado ↻
            </button>
            <div>
              <label className="label" htmlFor="m-width">
                Largura real (cm)
              </label>
              <input
                id="m-width"
                className="input w-28"
                inputMode="decimal"
                placeholder="ex.: 11,6"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
            <button type="button" disabled={busy || !widthCm} onClick={() => applyAdjust(up, widthCm)} className="btn-secondary text-xs">
              Ajustar tamanho
            </button>
            {adjusted && <span className="text-xs text-success">Ajustado: em pé e na largura informada.</span>}
          </div>

          <div className="flex flex-wrap gap-2">
            {(pendingGlb || pendingUsdz) && (
              <span className="chip bg-accent/15 text-accent-ink">
                <UploadIcon className="h-3 w-3" /> Será enviado ao guardar
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                resetLocal(null);
                onChange({ modelUrl: null, iosModelUrl: null, dims: null });
              }}
              className="btn-ghost text-xs text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover modelo 3D
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
