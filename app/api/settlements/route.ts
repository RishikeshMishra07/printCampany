import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: 1,
        reason: "Financial hardship settlement request",
        amount: 60000,
        status: "Approve",
        justification: "Customer suffered medical emergency and was out of work for 3 months. Supporting documents provided.",
        remarks: "Approved as per standard 50% waiver grid limits.",
        agent: { name: "Agent Alice" },
        createdAt: "2026-05-12T10:00:00Z"
      }
    ],
    total: 1
  });
}
