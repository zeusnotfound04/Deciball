import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const spaceName = searchParams.get('spaceName') || 'Music Space';
  const hostName = searchParams.get('hostName') || 'Someone';
  const hostPfp = searchParams.get('hostPfp') || '';

  const baseUrl = process.env.NEXTAUTH_URL || 'https://deciball.zeusnotfound.codes';
  const initial = hostName.charAt(0).toUpperCase();

  const [satoshiBlack, satoshiBold] = await Promise.all([
    loadFont(`${baseUrl}/fonts/og/Satoshi-Black.otf`),
    loadFont(`${baseUrl}/fonts/og/Satoshi-Bold.otf`),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000000',
        }}
      >
        <img
          src={`${baseUrl}/og.png`}
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px' }}
        />

        {/* Space name — just above "Listen along" */}
        <div
          style={{
            position: 'absolute',
            left: '205px',
            top: '250px',
            width: '500px',
            display: 'flex',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: spaceName.length > 20 ? '36px' : '46px',
              fontFamily: 'Satoshi Black',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            {spaceName}
          </span>
        </div>

        {/* PFP — top right corner */}
        <div
          style={{
            position: 'absolute',
            right: '80px',
            top: '55px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '115px',
              height: '115px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '103px',
                height: '103px',
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hostPfp ? '#111' : '#282828',
                border: '2px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {hostPfp ? (
                <img
                  src={hostPfp}
                  width={103}
                  height={103}
                  style={{ width: '103px', height: '103px', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#ffffff', fontSize: '38px', fontFamily: 'Satoshi Black' }}>
                  {initial}
                </span>
              )}
            </div>
          </div>

          <span style={{ color: '#c0c0c0', fontSize: '14px', fontFamily: 'Satoshi Bold', letterSpacing: '0.01em' }}>
            {hostName}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Satoshi Black', data: satoshiBlack, weight: 900, style: 'normal' },
        { name: 'Satoshi Bold', data: satoshiBold, weight: 700, style: 'normal' },
      ],
    }
  );
}
