import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session');
    
    if (sessionCookie && sessionCookie.value) {
      const user = JSON.parse(sessionCookie.value);
      return NextResponse.json({ success: true, user });
    }
    return NextResponse.json({ success: false, user: null });
  } catch (error) {
    return NextResponse.json({ success: false, user: null });
  }
}
