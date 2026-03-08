import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const s3Client = new S3Client({});
const textractClient = new TextractClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET!;
const PROMPTS_BUCKET = process.env.PROMPTS_BUCKET!;

let cachedPrompt: string | null = null;

async function loadPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  
  const command = new GetObjectCommand({
    Bucket: PROMPTS_BUCKET,
    Key: 'scheme-parser.txt',
  });
  
  const response = await s3Client.send(command);
  cachedPrompt = await response.Body!.transformToString();
  return cachedPrompt;
}

export const handler = async (event: S3Event) => {
  const startTime = Date.now();
  
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing PDF: ${key} from bucket: ${bucket}`);
    
    try {
      // Step 1: Extract text using Textract
      const textractCommand = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
      });
      
      const textractResponse = await textractClient.send(textractCommand);
      const extractedText = textractResponse.Blocks
        ?.filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .join('\n') || '';
      
      console.log(`Extracted ${extractedText.length} characters from PDF`);
      
      // Step 2: Store raw text in processed bucket
      const textKey = key.replace('.pdf', '.txt');
      await s3Client.send(new PutObjectCommand({
        Bucket: PROCESSED_BUCKET,
        Key: textKey,
        Body: extractedText,
        ContentType: 'text/plain',
      }));
      
      // Step 3: Parse with Claude Sonnet
      const promptTemplate = await loadPrompt();
      const prompt = promptTemplate.replace('{{EXTRACTED_TEXT}}', extractedText);
      
      const bedrockCommand = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });
      
      const bedrockResponse = await bedrockClient.send(bedrockCommand);
      const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
      const parsedScheme = JSON.parse(responseBody.content[0].text);
      
      console.log(`Parsed scheme: ${parsedScheme.scheme_name}`);
      
      // Step 4: Store in DynamoDB
      const schemeId = key.replace('.pdf', '').replace(/[^a-zA-Z0-9-]/g, '-');
      const version = new Date().toISOString();
      
      await dynamoClient.send(new PutCommand({
        TableName: 'GovSaathi-Schemes',
        Item: {
          scheme_id: schemeId,
          version,
          ...parsedScheme,
          raw_text_s3_key: textKey,
          pdf_s3_key: key,
          processed_at: new Date().toISOString(),
        },
      }));
      
      const processingTime = Date.now() - startTime;
      console.log(`Successfully processed ${key} in ${processingTime}ms`);
      
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      throw error;
    }
  }
};
