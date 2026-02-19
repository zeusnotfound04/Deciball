import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "@/lib/awsS3";

export const uploadtoS3 = async (file: Buffer, filename: string, contentType: string, fileType: string ) => {
  try {
    
    
    const fileBuffer = file;
    const timestampedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Use different folder structure based on file type
    let keyPrefix = 'images';
    if (fileType === 'profile') {
      keyPrefix = 'profile-images';
    }

    
    
    
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${keyPrefix}/${timestampedFilename}`,
      Body: fileBuffer,
      ContentType: contentType,
      // Make profile images publicly readable
      ACL: 'public-read' as const,
    };

    const command = new PutObjectCommand(params);
    
    
    const result = await s3Client.send(command);
    

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${keyPrefix}/${timestampedFilename}`;
    
    
    return fileUrl;
  } catch (error) {
    console.error(`[S3 Upload] Error uploading file ${filename}:`, error);
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};