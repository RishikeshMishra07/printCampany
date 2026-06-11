import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // In a real scenario, this would query the 'printing_records' table
    // Example: const res = await query('SELECT count(*) as total FROM printing_records');
    
    // For now, we return mock data structured for the UI
    const metrics = {
      totalPrinted: '1,245',
      activePrinters: '8 / 10',
      materialUsage: '34.2',
      failedPrints: '12'
    };

    const machines = [
      { id: 1, name: 'MakerBot-01', status: 'printing', details: 'Printing ABS...' },
      { id: 2, name: 'MakerBot-02', status: 'printing', details: 'Printing ABS...' },
      { id: 3, name: 'Formlabs-01', status: 'idle', details: 'Ready' },
      { id: 4, name: 'Prusa-01', status: 'error', details: 'Maintenance Required' },
      { id: 5, name: 'Ender-01', status: 'printing', details: 'Printing PLA...' }
    ];

    return NextResponse.json({ success: true, metrics, machines });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch printing dashboard data' }, { status: 500 });
  }
}
