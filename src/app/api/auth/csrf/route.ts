import { NextResponse } from 'next/server';
import { issueCsrf } from '@/domains/account/session';

export async function GET() {
  const { token, cookie } = issueCsrf();
  const res = NextResponse.json({ csrfToken: token });
  res.headers.set('set-cookie', cookie);
  return res;
}
