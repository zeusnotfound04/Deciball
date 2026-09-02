import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const spaceName = searchParams.get('spaceName') || 'Music Space';
  const hostName = searchParams.get('hostName') || 'Someone';
  const hostPfp = searchParams.get('hostPfp') || '';

  const baseUrl = process.env.NEXTAUTH_URL || 'https://deciball.zeusnotfound.codes';
  const initial = hostName.charAt(0).toUpperCase();

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

        {/* Host PFP or fallback initial */}
        <div
          style={{
            position: 'absolute',
            left: '105px',
            top: '190px',
            width: '155px',
            height: '155px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hostPfp ? 'transparent' : '#282828',
          }}
        >
          {hostPfp ? (
            <img
              src={hostPfp}
              width={155}
              height={155}
              style={{ width: '155px', height: '155px', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#ffffff', fontSize: '56px', fontFamily: 'sans-serif', fontWeight: 700 }}>
              {initial}
            </span>
          )}
        </div>

        {/* Host name */}
        <div
          style={{
            position: 'absolute',
            left: '70px',
            top: '360px',
            width: '230px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#c0c0c0', fontSize: '16px', fontFamily: 'sans-serif' }}>
            {hostName}
          </span>
        </div>

        {/* Space name + subtitle */}
        <div
          style={{
            position: 'absolute',
            left: '380px',
            top: '170px',
            width: '740px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: spaceName.length > 20 ? '36px' : '46px',
              fontFamily: 'serif',
              fontStyle: 'italic',
              lineHeight: 1.15,
            }}
          >
            {spaceName}
          </span>
          <span style={{ color: '#7f7f7f', fontSize: '15px', fontFamily: 'sans-serif', marginTop: '6px' }}>
            Join {hostName} on Deciball
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
