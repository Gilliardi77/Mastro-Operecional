// src/app/api/auth/session/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    
    if (!adminAuth) {
      throw new Error("A autenticação do Admin não está inicializada no servidor.");
    }
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    // Use NextResponse to set the cookie, which is more robust for API routes
    const response = NextResponse.json({ status: 'success' });
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none', // Necessary for cross-site cookie sending in environments like Firebase Studio
    });
    
    return response;
  } catch (error: any) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session', details: error.message }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    // Use NextResponse to delete the cookie for consistency
    const response = NextResponse.json({ status: 'success' });
    response.cookies.delete('__session');
    return response;
  } catch (error: any) {
    console.error('Error deleting session cookie:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
