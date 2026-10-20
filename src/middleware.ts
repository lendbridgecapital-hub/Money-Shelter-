import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (host.includes('onrender.com') || host.includes('render.com')) {
    const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://money-shelter.vercel.app');
    return NextResponse.redirect(targetUrl, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
