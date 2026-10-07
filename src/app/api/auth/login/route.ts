import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';

const REQUIRED_USERNAME = 'miakhilfamily';
const REQUIRED_PASSWORD = 'SMH07+++';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check credentials (case-insensitive for username convenience)
    if (username.trim().toLowerCase() !== REQUIRED_USERNAME.toLowerCase() || password !== REQUIRED_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password. Access denied.' },
        { status: 401 }
      );
    }

    const token = createToken({
      username: REQUIRED_USERNAME,
      timestamp: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        username: REQUIRED_USERNAME,
        name: 'Miakhil Family Admin',
        role: 'admin',
      },
    });

    // Set HTTP-only secure session cookie valid for 30 days
    response.cookies.set({
      name: 'family_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
