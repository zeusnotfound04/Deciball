import { uploadtoS3 } from "@/actions/users/uploadToS3";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; 

export async function POST(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    
    const files = formData.getAll("files") as File[];
    
    const imageType = formData.get("imageType") as string ;
    
    if (files.length === 0) {
      return NextResponse.json({ success: true, fileUrls: [] });
    }
    console.log("Received files:", files);
    console.log("Number of files received:", files.length);
    const uploadedFileUrls: string[] = [];
    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) {
          return NextResponse.json({ error: `File ${file.name} is not a valid image.` }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({ 
            error: `File ${file.name} exceeds the maximum size limit of 5MB.`,
            maxSizeInMB: MAX_FILE_SIZE / (1024 * 1024)
          }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;

        const fileUrl = await uploadtoS3(buffer, fileName, file.type, imageType);
        
        uploadedFileUrls.push(fileUrl);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
      }
    }

    if (uploadedFileUrls.length === 0 && files.length > 0) {
      return NextResponse.json(
        { error: "No files were successfully uploaded." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, fileUrls: uploadedFileUrls });
  } catch (error) {
    console.error("Error in upload route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}