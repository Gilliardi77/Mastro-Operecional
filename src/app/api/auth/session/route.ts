// src/app/api/auth/session/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
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
    
    // This verifies the token and creates a session cookie.
    if (!adminAuth) {
      throw new Error("A autenticação do Admin não está inicializada no servidor.");
    }
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    cookies().set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      // The 'Secure' attribute is required for 'SameSite=None'
      // The Firebase Studio dev environment uses HTTPS, so this is safe.
      secure: true,
      path: '/',
      // 'None' is necessary for cross-origin requests in dev environments like Firebase Studio
      sameSite: 'none',
    });
    
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session', details: error.message }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Error deleting session cookie:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
