import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const spaceName = searchParams.get('spaceName') || 'Music Space';
  const hostName = searchParams.get('hostName') || 'Someone';
  const hostPfp = searchParams.get('hostPfp') || '';
  const initial = hostName.charAt(0).toUpperCase();

  let satoshiBlack: ArrayBuffer | undefined;
  let satoshiBold: ArrayBuffer | undefined;
  let ogImageBase64 = '';

  try {
    const fontBlack = await readFile(join(process.cwd(), 'public/fonts/og/Satoshi-Black.otf'));
    satoshiBlack = fontBlack.buffer.slice(fontBlack.byteOffset, fontBlack.byteOffset + fontBlack.byteLength);
    const fontBold = await readFile(join(process.cwd(), 'public/fonts/og/Satoshi-Bold.otf'));
    satoshiBold = fontBold.buffer.slice(fontBold.byteOffset, fontBold.byteOffset + fontBold.byteLength);
  } catch {}

  try {
    const ogFile = await readFile(join(process.cwd(), 'public/og.png'));
    ogImageBase64 = `data:image/png;base64,${ogFile.toString('base64')}`;
  } catch {}

  let pfpBase64 = '';
  if (hostPfp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const pfpRes = await fetch(hostPfp, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Deciball-OG/1.0' },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (pfpRes.ok) {
        const pfpBuffer = Buffer.from(await pfpRes.arrayBuffer());
        const contentType = pfpRes.headers.get('content-type') || 'image/jpeg';
        pfpBase64 = `data:${contentType};base64,${pfpBuffer.toString('base64')}`;
      } else {
        console.error(`[OG] Failed to fetch pfp: ${pfpRes.status} ${pfpRes.statusText} for ${hostPfp}`);
      }
    } catch (err: any) {
      console.error(`[OG] Error fetching pfp: ${err.message} for ${hostPfp}`);
    }
  }

  const fonts: any[] = [];
  if (satoshiBlack) fonts.push({ name: 'Satoshi Black', data: satoshiBlack, weight: 900, style: 'normal' });
  if (satoshiBold) fonts.push({ name: 'Satoshi Bold', data: satoshiBold, weight: 700, style: 'normal' });

  const fontFamily = satoshiBlack ? 'Satoshi Black' : 'sans-serif';
  const fontFamilyBold = satoshiBold ? 'Satoshi Bold' : 'sans-serif';

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
        {/* Background template from file */}
        {ogImageBase64 && (
          <img
            src={ogImageBase64}
            width={1200}
            height={630}
            style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px' }}
          />
        )}

        {/* Space name */}
        <div
          style={{
            position: 'absolute',
            left: '170px',
            top: '250px',
            width: '520px',
            display: 'flex',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: spaceName.length > 20 ? '36px' : '46px',
              fontFamily,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            {spaceName}
          </span>
        </div>

        {/* PFP — top right */}
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
                backgroundColor: '#282828',
              }}
            >
              {pfpBase64 ? (
                <img
                  src={pfpBase64}
                  width={103}
                  height={103}
                  style={{ width: '103px', height: '103px', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#ffffff', fontSize: '38px', fontFamily, fontWeight: 900 }}>
                  {initial}
                </span>
              )}
            </div>
          </div>

          <span style={{ color: '#c0c0c0', fontSize: '14px', fontFamily: fontFamilyBold, fontWeight: 700, letterSpacing: '0.01em' }}>
            {hostName}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
