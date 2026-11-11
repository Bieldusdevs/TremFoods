import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { audit, log } from '@/infra/logging';

export const dynamic = 'force-dynamic';

// Upload direto do navegador para o Vercel Blob (os .glb passam do limite de ~4,5 MB
// das funções). Esta rota só emite o token — e só para o administrador.
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB: escaneamentos de celular são grandes
const ALLOWED_TYPES = ['model/gltf-binary', 'model/vnd.usdz+zip', 'application/octet-stream', 'image/webp', 'image/jpeg', 'image/png'];
const ALLOWED_EXT = /\.(glb|usdz|webp|jpe?g|png)$/i;

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fail(503, 'STORAGE_OFF', 'O armazenamento de modelos 3D não está configurado (BLOB_READ_WRITE_TOKEN). Cole o link do modelo.');
  }
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return fail(400, 'BAD_REQUEST', 'Pedido inválido.');

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // O token CSRF viaja no clientPayload (o upload do Blob não aceita cabeçalhos próprios).
        const csrfReq = new Request(req.url, { headers: { cookie: req.headers.get('cookie') ?? '', 'x-csrf-token': clientPayload ?? '' } });
        if (!verifyCsrf(csrfReq)) throw new Error('Token de segurança inválido.');
        const { user } = await requireUser();
        if (!user || user.role !== 'ADMIN') throw new Error('Acesso restrito.');
        if (!ALLOWED_EXT.test(pathname)) throw new Error('Tipo de arquivo não permitido.');
        await audit('admin.model.upload', req, user.id, user.email, { pathname });
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        log('info', 'admin.model.uploaded', { pathname: blob.pathname });
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return fail(400, 'UPLOAD_REFUSED', e instanceof Error ? e.message : 'Não foi possível enviar.');
  }
}
