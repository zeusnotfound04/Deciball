import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const spaceName = searchParams.get('spaceName') || 'Music Space';
  const hostName = searchParams.get('hostName') || 'Someone';
  const hostPfp = searchParams.get('hostPfp') || '';

  const baseUrl = process.env.NEXTAUTH_URL || 'https://deciball.zeusnotfound.codes';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background template image */}
        <img
          src={`${baseUrl}/og.png`}
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px' }}
        />

        {/* Host PFP — positioned inside the circle on the template */}
        {hostPfp && (
          <img
            src={hostPfp}
            width={140}
            height={140}
            style={{
              position: 'absolute',
              left: '118px',
              top: '195px',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Host name — below the circle */}
        <div
          style={{
            position: 'absolute',
            left: '80px',
            top: '355px',
            width: '220px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: '#c0c0c0',
              fontSize: '16px',
              fontFamily: 'sans-serif',
              textAlign: 'center',
            }}
          >
            {hostName}
          </span>
        </div>

        {/* Space name — above "Listen along" */}
        <div
          style={{
            position: 'absolute',
            left: '370px',
            top: '180px',
            width: '750px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: '42px',
              fontFamily: 'serif',
              fontStyle: 'italic',
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {spaceName}
          </span>
          <span
            style={{
              color: '#7f7f7f',
              fontSize: '14px',
              fontFamily: 'sans-serif',
              marginTop: '4px',
            }}
          >
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
