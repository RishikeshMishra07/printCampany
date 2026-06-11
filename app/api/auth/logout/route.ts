import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the secure HttpOnly session cookie
  response.cookies.set('auth_session', '', {
    httpOnly: true,
    expires: new Date(0), // Set expiration date in the past to delete the cookie
    path: '/',
  });

  return response;
}
