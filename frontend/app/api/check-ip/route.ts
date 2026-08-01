import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cfIp = request.headers.get('cf-connecting-ip');
    const trueClientIp = request.headers.get('true-client-ip');
    const realIp = request.headers.get('x-real-ip');
    const forwardedFor = request.headers.get('x-forwarded-for');

    let clientIp = cfIp || trueClientIp || realIp || '';
    if (!clientIp && forwardedFor) {
      clientIp = forwardedFor.split(',')[0].trim();
    }
    if (!clientIp) {
      clientIp = (request as any).ip || '127.0.0.1';
    }

    const allowedIpString = (process.env.IP || '').replace(/["']/g, '');
    const allowedIps = allowedIpString
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    // Jika pengujian dilakukan dari localhost (loopback ::1 / 127.0.0.1),
    // sementara IP yang diizinkan bukan loopback, kita otomatis mendeteksi IP publik eksternal (tethering/internet) mesin ini.
    const isLoopback =
      clientIp === '::1' ||
      clientIp === '127.0.0.1' ||
      clientIp === 'localhost' ||
      clientIp === '::ffff:127.0.0.1';
    const expectsLoopback = allowedIps.some(
      (ip) => ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
    );

    if (isLoopback && !expectsLoopback && allowedIps.length > 0) {
      try {
        const res = await fetch('https://api64.ipify.org?format=json', {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ip) {
            clientIp = data.ip;
          }
        }
      } catch (e) {
        console.error('Gagal mendeteksi external IP di localhost:', e);
      }
    }

    if (allowedIps.length > 0) {
      const isAllowed = allowedIps.some(
        (ip) => clientIp === ip || clientIp.includes(ip)
      );

      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            allowed: false,
            clientIp,
            message: `Proses tarik Excel hanya dapat dilakukan menggunakan jaringan OJK (IP Anda: ${clientIp} tidak diizinkan).`,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      allowed: true,
      clientIp,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        allowed: false,
        message: 'Gagal memverifikasi IP jaringan OJK.',
      },
      { status: 500 }
    );
  }
}
