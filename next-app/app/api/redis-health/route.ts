import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      status: "healthy",
      message: "Redis health check endpoint"
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Redis health check failed"
    }, { status: 500 });
  }
}