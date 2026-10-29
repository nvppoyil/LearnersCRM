import { NextResponse } from 'next/server';

// Asks for a password (CRM_PASSWORD). The WhatsApp webhook is open because Meta must reach it.
export function middleware(req) {
  if (req.nextUrl.pathname.startsWith('/api/whatsapp')) return NextResponse.next();
  const pass = process.env.CRM_PASSWORD;
  if (!pass) return NextResponse.next();
  const h = req.headers.get('authorization') || '';
  if (h.startsWith('Basic ')) {
    const decoded = atob(h.slice(6));
    if (decoded.slice(decoded.indexOf(':') + 1) === pass) return NextResponse.next();
  }
  return new NextResponse('Password needed', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="CRM"' },
  });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
