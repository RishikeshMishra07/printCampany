import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response('Job ID required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const res = await query(`SELECT id, status, total_rows, processed_rows, error_log FROM upload_jobs WHERE id = $1`, [jobId]);
          if (res.rows.length > 0) {
            const job = res.rows[0];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
            
            // Close stream if finished
            if (job.status === 'COMPLETED' || job.status === 'FAILED') {
              controller.close();
              return true;
            }
          }
        } catch (e) {
          controller.error(e);
          return true;
        }
        return false;
      };

      // Initial send
      await sendUpdate();

      // Poll every 1 second and stream the result
      const interval = setInterval(async () => {
        const done = await sendUpdate();
        if (done) clearInterval(interval);
      }, 1000);

      // Clean up on close
      req.signal.onabort = () => {
        clearInterval(interval);
        controller.close();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
