import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/' || path.startsWith('/api/auth');

  // Get the session cookie
  const sessionCookie = request.cookies.get('auth_session');

  // If the user is NOT logged in and trying to access a protected route
  if (!isPublicPath && !sessionCookie) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If the user IS logged in
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      
      // If logged in and trying to access login page, redirect to their respective dashboard
      if (path === '/') {
        if (session.role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
        if (session.role === 'user') {
          const deptPath = session.department === 'Store' ? 'general' : 'general'; // Defaulting store to general inward/outward
          return NextResponse.redirect(new URL(`/dashboard/live-stock/${deptPath}`, request.url));
        }
      }

      // --- RBAC (Role-Based Access Control) ---
      // Define Admin-only routes
      const adminOnlyPaths = [
        '/dashboard/admin', 
        '/dashboard/audit', 
        '/dashboard/deals', 
        '/dashboard/master-data', 
        '/dashboard/vendors',
        '/dashboard/paint-norms',
        '/dashboard/inventory'
      ];

      const isAdminPath = adminOnlyPaths.some(p => path.startsWith(p));
      const isBaseDashboard = path === '/dashboard';

      if (session.role === 'user') {
        // Prevent User from accessing Admin routes or the root Admin Dashboard
        if (isAdminPath || isBaseDashboard) {
          const deptPath = session.department === 'Store' ? 'general' : 'general';
          return NextResponse.redirect(new URL(`/dashboard/live-stock/${deptPath}`, request.url));
        }
      }

    } catch (e) {
      // If cookie parsing fails, clear it and redirect to login
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png).*)',
  ],
};
