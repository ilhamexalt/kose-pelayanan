import { NextResponse } from 'next/server';
import { POST as runSendH1 } from '../send-h1/route';
import { POST as runSendReminder } from '../send-reminder/route';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'all'; // 'h1' | 'reminder' | 'all'

    const results: any = {};

    // 1. Eksekusi pengingat H-1 Jam
    if (action === 'all' || action === 'reminder') {
      try {
        const resReminder = await runSendReminder(request);
        const dataReminder = await resReminder.json();
        results.reminder = {
          status: resReminder.status,
          data: dataReminder
        };
      } catch (err: any) {
        results.reminder = { error: err.message };
      }
    }

    // 2. Eksekusi pengiriman H+1 (sore hari jam 16.00 WIB atau sesuai trigger)
    if (action === 'all' || action === 'h1') {
      try {
        // Cek jam sekarang di WIB (UTC+7)
        const nowWIBHour = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCHours();
        // Jika action == 'all', eksekusi H+1 hanya jika jam >= 16 WIB
        // Jika action == 'h1', paksa jalan eksekusi tanpa batas jam
        if (action === 'h1' || nowWIBHour >= 16) {
          const resH1 = await runSendH1(request);
          const dataH1 = await resH1.json();
          results.h1 = {
            status: resH1.status,
            data: dataH1
          };
        } else {
          results.h1 = {
            skipped: true,
            message: `Belum jam 16.00 WIB (jam sekarang: ${nowWIBHour}.00 WIB). Pengiriman H+1 dilakukan mulai pukul 16.00 WIB.`
          };
        }
      } catch (err: any) {
        results.h1 = { error: err.message };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      action,
      results
    });
  } catch (error: any) {
    console.error('Error on /api/pimpinan/cron:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
