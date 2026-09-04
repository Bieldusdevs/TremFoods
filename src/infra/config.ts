import { z } from 'zod';

// Validação central das variáveis de ambiente — falha cedo se faltar algo crítico.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url().default('http://localhost:3000'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().optional().default('Trem Food <no-reply@tremfood.pt>'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Configuração de ambiente inválida — ${msg}`);
}

export const env = parsed.data;
export const isProd = process.env.NODE_ENV === 'production';

/** SMTP configurado? Sem SMTP os e-mails não saem — útil para saber se o link de
 *  verificação/reposição pode ser devolvido na resposta (apenas dev/testes). */
export const mailConfigured = Boolean(env.SMTP_HOST);
