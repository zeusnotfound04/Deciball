import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "@/lib/awsS3";

export const uploadtoS3 = async (file: Buffer, filename: string, contentType: string, fileType: string ) => {
  const fileBuffer = file;
  const timestampedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `images/${timestampedFilename}`,
    Body: fileBuffer,
    ContentType: contentType, 
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/images/${timestampedFilename}`;
};