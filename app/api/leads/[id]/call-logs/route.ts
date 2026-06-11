import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    logs: [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        details: {
          connectStatus: "Right Party Connect",
          disposition: "Follow-Up",
          subDisposition: "Call Back",
          remarks: "Customer asked to callback tomorrow morning",
          date: "2026-05-29"
        },
        user: { name: "Agent Alice", empId: "EMP-102" }
      }
    ],
    totalCount: 1,
    stats: { rpcCount: 1, ptpCount: 0, ncCount: 0 }
  });
}
