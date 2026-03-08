import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const RAW_BUCKET = process.env.RAW_BUCKET!;

export const handler = async (event: any) => {
  console.log('Batch coordinator invoked');
  
  // List all PDFs in raw bucket
  const listCommand = new ListObjectsV2Command({
    Bucket: RAW_BUCKET,
    Prefix: event.prefix || '',
  });
  
  const listResponse = await s3Client.send(listCommand);
  
  const pdfFiles = (listResponse.Contents || [])
    .filter(obj => obj.Key?.endsWith('.pdf'))
    .map(obj => ({
      Records: [
        {
          s3: {
            bucket: { name: RAW_BUCKET },
            object: { key: obj.Key },
          },
        },
      ],
    }));
  
  console.log(`Found ${pdfFiles.length} PDF files to process`);
  
  return {
    schemes: pdfFiles,
    total_count: pdfFiles.length,
  };
};
