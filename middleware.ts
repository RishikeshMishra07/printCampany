import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/' || path.startsWith('/api/auth');

  // Get the session cookie
  const session = request.cookies.get('auth_session');

  // If the user is NOT logged in and trying to access a protected route
  if (!isPublicPath && !session) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If the user IS logged in and trying to access the login page (/), redirect to dashboard
  if (path === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png).*)',
  ],
};
