import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envVars = {
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME ? 'SET' : 'NOT SET',
      AWS_S3_REGION: process.env.AWS_S3_REGION ? 'SET' : 'NOT SET',
      AWS_S3_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
    };

    console.log('[S3 Config] Environment variables:', envVars);

    return NextResponse.json({
      message: 'S3 Configuration Check',
      environment: envVars,
      allSet: Object.values(envVars).every(val => val === 'SET')
    });
  } catch (error) {
    console.error('[S3 Config] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to check S3 configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
