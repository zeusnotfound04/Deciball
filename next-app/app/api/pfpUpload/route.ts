import { uploadtoS3 } from "@/actions/users/uploadToS3";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; 

export async function POST(req: Request): Promise<Response> {
  try {
    console.log('[PFP Upload] Starting upload process...');
    const formData = await req.formData();
    
    const files = formData.getAll("files") as File[];
    const imageType = formData.get("imageType") as string;
    
    console.log('[PFP Upload] Files received:', files.length);
    console.log('[PFP Upload] Image type:', imageType);
    
    if (files.length === 0) {
      console.log('[PFP Upload] No files received');
      return NextResponse.json({ success: true, fileUrls: [] });
    }
    
    console.log("Received files:", files);
    console.log("Number of files received:", files.length);
    const uploadedFileUrls: string[] = [];
    
    for (const file of files) {
      try {
        console.log(`[PFP Upload] Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        
        if (!file.type.startsWith("image/")) {
          console.error(`[PFP Upload] Invalid file type: ${file.type}`);
          return NextResponse.json({ error: `File ${file.name} is not a valid image.` }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          console.error(`[PFP Upload] File too large: ${file.size}`);
          return NextResponse.json({ 
            error: `File ${file.name} exceeds the maximum size limit of 5MB.`,
            maxSizeInMB: MAX_FILE_SIZE / (1024 * 1024)
          }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;

        let fileUrl: string;

        const hasS3Config = process.env.AWS_S3_BUCKET_NAME && 
                           process.env.AWS_S3_REGION && 
                           process.env.AWS_S3_ACCESS_KEY_ID && 
                           process.env.AWS_S3_SECRET_ACCESS_KEY;

        if (!hasS3Config) {
          console.error('[PFP Upload] S3 configuration missing. Required environment variables: AWS_S3_BUCKET_NAME, AWS_S3_REGION, AWS_S3_ACCESS_KEY_ID, AWS_S3_SECRET_ACCESS_KEY');
          return NextResponse.json({ 
            error: "S3 storage is not properly configured. Please contact administrator." 
          }, { status: 500 });
        }

        console.log(`[PFP Upload] Uploading to S3: ${fileName}`);
        try {
          fileUrl = await uploadtoS3(buffer, fileName, file.type, imageType);
          console.log(`[PFP Upload] S3 Upload successful: ${fileUrl}`);
        } catch (s3Error) {
          console.error(`[PFP Upload] S3 upload failed:`, s3Error);
          return NextResponse.json({ 
            error: `Failed to upload to S3: ${s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'}` 
          }, { status: 500 });
        }
        
        uploadedFileUrls.push(fileUrl);
      } catch (fileError) {
        console.error(`[PFP Upload] Error processing file ${file.name}:`, fileError);
        return NextResponse.json({ 
          error: `Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` 
        }, { status: 500 });
      }
    }

    if (uploadedFileUrls.length === 0 && files.length > 0) {
      console.error('[PFP Upload] No files were successfully uploaded');
      return NextResponse.json(
        { error: "No files were successfully uploaded." },
        { status: 500 }
      );
    }

    console.log(`[PFP Upload] Upload completed successfully. URLs: ${uploadedFileUrls}`);
    return NextResponse.json({ success: true, fileUrls: uploadedFileUrls });
  } catch (error) {
    console.error("[PFP Upload] Error in upload route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}