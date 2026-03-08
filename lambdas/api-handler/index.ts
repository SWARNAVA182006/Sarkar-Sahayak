import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const SCHEMES_TABLE = process.env.SCHEMES_TABLE!;
const PROMPTS_BUCKET = process.env.PROMPTS_BUCKET!;

let cachedExplanationPrompt: string | null = null;
let cachedTranslationPrompt: string | null = null;

async function loadPrompt(promptName: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: PROMPTS_BUCKET,
    Key: `${promptName}.txt`,
  });
  
  const response = await s3Client.send(command);
  return await response.Body!.transformToString();
}

async function getExplanationPrompt(): Promise<string> {
  if (!cachedExplanationPrompt) {
    cachedExplanationPrompt = await loadPrompt('explanation-generator');
  }
  return cachedExplanationPrompt;
}

async function getTranslationPrompt(): Promise<string> {
  if (!cachedTranslationPrompt) {
    cachedTranslationPrompt = await loadPrompt('translation');
  }
  return cachedTranslationPrompt;
}

async function invokeBedrockWithRetry(
  modelId: string,
  prompt: string,
  maxTokens: number,
  retries = 3
): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      
      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error: any) {
      if (error.name === 'ThrottlingException' && attempt < retries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`Throttled, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  console.log(`Request ${requestId}: ${event.httpMethod} ${event.path}`);
  
  try {
    if (event.httpMethod !== 'POST' || event.path !== '/prod/match') {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
    
    const body = JSON.parse(event.body || '{}');
    const { query, language = 'Hindi' } = body;
    
    if (!query) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ error: 'Missing query parameter' }),
      };
    }
    
    console.log(`Query: ${query}, Language: ${language}`);
    
    // Phase 1: Simple mock matching - just return first scheme from DB
    const scanCommand = new ScanCommand({
      TableName: SCHEMES_TABLE,
      Limit: 1,
    });
    
    const scanResult = await dynamoClient.send(scanCommand);
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({
          error: 'No schemes found in database',
          message: 'Please upload scheme PDFs to the raw schemes bucket',
        }),
      };
    }
    
    const matchedScheme = scanResult.Items[0];
    
    // Generate explanation using Claude
    const explanationPromptTemplate = await getExplanationPrompt();
    const explanationPrompt = explanationPromptTemplate
      .replace('{{LANGUAGE}}', language)
      .replace('{{SCHEME_DETAILS}}', JSON.stringify(matchedScheme, null, 2))
      .replace('{{USER_CONTEXT}}', query);
    
    const explanation = await invokeBedrockWithRetry(
      'anthropic.claude-3-sonnet-20240229-v1:0',
      explanationPrompt,
      1500
    );
    
    // Translate to target language if not English
    let translatedExplanation = explanation;
    if (language !== 'English') {
      const translationPromptTemplate = await getTranslationPrompt();
      const translationPrompt = translationPromptTemplate
        .replace('{{TARGET_LANGUAGE}}', language)
        .replace('{{TEXT}}', explanation);
      
      translatedExplanation = await invokeBedrockWithRetry(
        'anthropic.claude-3-haiku-20240307-v1:0',
        translationPrompt,
        800
      );
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        matched_schemes: [
          {
            scheme_id: matchedScheme.scheme_id,
            scheme_name: matchedScheme.scheme_name,
            ministry: matchedScheme.ministry,
            confidence_score: 0.85, // Mock score for Phase 1
          },
        ],
        explanation: translatedExplanation,
        language,
        processing_time_ms: processingTime,
        bedrock_model_used: 'claude-3-sonnet + claude-3-haiku',
        request_id: requestId,
      }),
    };
    
  } catch (error: any) {
    console.error(`Error in request ${requestId}:`, error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        request_id: requestId,
      }),
    };
  }
};
