import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const metrics = {
      readyForDispatch: '45',
      shippedToday: '128',
      delivered: '89',
      pendingShipments: '12'
    };

    const shipments = [
      { id: 9021, client: 'Maruti Suzuki Service', parts: '12x Bumper Clips', courier: 'BlueDart', status: 'Delivered' },
      { id: 9022, client: 'Hyundai Motors', parts: '50x AC Vents', courier: 'Delhivery', status: 'In Transit' },
      { id: 9023, client: 'Local Mechanic Hub', parts: '5x Engine Covers', courier: 'DTDC', status: 'In Transit' },
      { id: 9024, client: 'Tata Motors', parts: '100x Door Handles', courier: 'FedEx', status: 'Delayed' },
      { id: 9025, client: 'Mahindra Service', parts: '20x Dashboard Clips', courier: 'BlueDart', status: 'In Transit' }
    ];

    return NextResponse.json({ success: true, metrics, shipments });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch Dispatch dashboard data' }, { status: 500 });
  }
}
