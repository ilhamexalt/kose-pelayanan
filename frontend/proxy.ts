import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSession } from './lib/session';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/login', '/lupa-password', '/layar-antrean', '/guest'];
// Also allow API routes related to login/auth and public assets
const publicPrefixes = ['/api/login', '/api/lupa-password', '/api/auth/me', '/api/logout', '/_next', '/favicon', '/assets'];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for public routes and static assets
  if (publicRoutes.includes(pathname) || publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('auth_session')?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }
    // Redirect to login if no session cookie exists
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // To verify the token safely on the edge, we would need to use jose or Web Crypto API.
  // Since we use a Node.js crypto module for session, we will just rely on existence here 
  // and let the API routes / AuthProvider fail gracefully if it's spoofed.
  return NextResponse.next();
}

// Ensure middleware runs only for relevant paths
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/.*).*)'],
};
