import { NextRequest, NextResponse } from 'next/server';

interface DownloadResponse {
  link: string;
  title: string;
  filesize: number;
  progress: number;
  duration: number;
  status: string;
  msg: string;
}

async function handleDownload(youtubeId: string) {
  const downloadBaseUrl = process.env.DOWNLOAD_URL;
  
  if (!downloadBaseUrl) {
    throw new Error('Download URL not configured');
  }

  const downloadUrl = `${downloadBaseUrl}${youtubeId}`;
  console.log('Fetching download link from:', downloadUrl);

  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch download link: ${response.status}`);
  }

  const data: DownloadResponse = await response.json();
  console.log('Download API response:', data);

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('Search params:', searchParams);
    const youtubeId = searchParams.get('id') || searchParams.get('videoId');

    if (!youtubeId) {
      return NextResponse.json(
        { error: 'YouTube video ID is required (use ?id=VIDEO_ID or ?videoId=VIDEO_ID)' },
        { status: 400 }
      );
    }

    const data = await handleDownload(youtubeId);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('POST request body:', body);
    // Support multiple parameter names: id, youtubeId, videoId
    const youtubeId = body.id || body.youtubeId || body.videoId;

    if (!youtubeId) {
      return NextResponse.json(
        { error: 'YouTube video ID is required in request body (use id, youtubeId, or videoId)' },
        { status: 400 }
      );
    }

    const data = await handleDownload(youtubeId);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
