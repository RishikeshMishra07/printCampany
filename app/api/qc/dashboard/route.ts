import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const metrics = {
      partsInspected: '1,120',
      defectRate: '1.2%',
      approved: '1,107',
      rejected: '13'
    };

    const recentInspections = [
      { id: 1, batch: '1025', inspector: 'Raju (AP-102)', status: 'passed', note: 'Passed' },
      { id: 2, batch: '1026', inspector: 'Raju (AP-102)', status: 'passed', note: 'Passed' },
      { id: 3, batch: '1027', inspector: 'Raju (AP-102)', status: 'failed', note: 'Rejected (Crack)' },
      { id: 4, batch: '1028', inspector: 'Raju (AP-102)', status: 'passed', note: 'Passed' }
    ];

    return NextResponse.json({ success: true, metrics, recentInspections });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch QC dashboard data' }, { status: 500 });
  }
}
