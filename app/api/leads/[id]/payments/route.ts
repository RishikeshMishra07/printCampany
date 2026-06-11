import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    payments: [
      { id: 1, date: "2026-05-10", amount: 15000, mode: "Online UPI", ref: "UPI-82019281", agent: { name: "Agent Alice" }, status: "cleared" },
      { id: 2, date: "2026-05-18", amount: 5000, mode: "NetBanking", ref: "TXN-29102912", agent: { name: "Agent Bob" }, status: "pending_approval" }
    ],
    summary: {
      count: 2,
      clearedCount: 1,
      pendingCount: 1,
      rejectedCount: 0,
      cleared: 15000,
      pending: 5000,
      rejected: 0
    },
    total: 2,
    totalPages: 1
  });
}
