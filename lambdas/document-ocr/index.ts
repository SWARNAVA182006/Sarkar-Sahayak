import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, AnalyzeDocumentCommand, FeatureType } from '@aws-sdk/client-textract';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const s3Client = new S3Client({});
const textractClient = new TextractClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USERS_TABLE = process.env.USERS_TABLE!;

interface ExtractedData {
  name?: string;
  dob?: string;
  address?: string;
  id_number?: string;
  gender?: string;
  state?: string;
  district?: string;
  pincode?: string;
  [key: string]: any;
}

function extractFieldsFromKeyValuePairs(keyValuePairs: any[]): ExtractedData {
  const extracted: ExtractedData = {};
  
  const fieldMappings: Record<string, string[]> = {
    name: ['name', 'full name', 'applicant name'],
    dob: ['dob', 'date of birth', 'birth date', 'yob', 'year of birth'],
    address: ['address', 'permanent address', 'present address'],
    id_number: ['aadhaar', 'aadhar', 'aadhaar number', 'id number', 'ration card'],
    gender: ['gender', 'sex'],
    state: ['state'],
    district: ['district'],
    pincode: ['pin', 'pincode', 'pin code', 'postal code'],
  };
  
  for (const pair of keyValuePairs) {
    const key = pair.Key?.Text?.toLowerCase() || '';
    const value = pair.Value?.Text || '';
    
    if (!key || !value) continue;
    
    // Match key to field
    for (const [field, keywords] of Object.entries(fieldMappings)) {
      if (keywords.some(keyword => key.includes(keyword))) {
        extracted[field] = value;
        break;
      }
    }
  }
  
  return extracted;
}

export const handler = async (event: S3Event) => {
  const startTime = Date.now();
  
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing document: ${key} from bucket: ${bucket}`);
    
    try {
      // Extract user_id from key (format: user_id/timestamp-filename)
      const userId = key.split('/')[0];
      
      if (!userId) {
        console.error('Could not extract user_id from key');
        continue;
      }
      
      // Analyze document with Textract
      const analyzeCommand = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
        FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
      });
      
      const textractResponse = await textractClient.send(analyzeCommand);
      
      // Extract key-value pairs
      const keyValuePairs = textractResponse.Blocks?.filter(
        block => block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')
      ) || [];
      
      console.log(`Found ${keyValuePairs.length} key-value pairs`);
      
      // Extract structured data
      const extractedData = extractFieldsFromKeyValuePairs(keyValuePairs);
      
      console.log('Extracted data:', extractedData);
      
      // Update user profile in DynamoDB
      const updateCommand = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { user_id: userId },
        UpdateExpression: 'SET document_data = :data, document_s3_key = :key, document_processed_at = :timestamp',
        ExpressionAttributeValues: {
          ':data': extractedData,
          ':key': key,
          ':timestamp': new Date().toISOString(),
        },
      });
      
      await dynamoClient.send(updateCommand);
      
      const processingTime = Date.now() - startTime;
      console.log(`Successfully processed ${key} in ${processingTime}ms`);
      
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      // Don't throw - continue processing other documents
    }
  }
};
