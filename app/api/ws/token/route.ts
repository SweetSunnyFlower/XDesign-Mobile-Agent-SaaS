import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
/**
 * Generate WebSocket authentication token
 * GET /api/ws/token
 */
export async function GET() {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      );
    }

    // Get JWT secret
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate JWT token with user ID
    const token = jwt.sign(
      { userId: user.id },
      secret,
      { expiresIn: '24h' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('WebSocket token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
