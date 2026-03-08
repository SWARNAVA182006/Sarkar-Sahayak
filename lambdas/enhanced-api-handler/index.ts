import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const lambdaClient = new LambdaClient({});

const SCHEMES_TABLE = process.env.SCHEMES_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const PROMPTS_BUCKET = process.env.PROMPTS_BUCKET!;
const VOICE_GENERATOR_FUNCTION = process.env.VOICE_GENERATOR_FUNCTION!;

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

async function generateVoice(text: string, language: string): Promise<any> {
  const invokeCommand = new InvokeCommand({
    FunctionName: VOICE_GENERATOR_FUNCTION,
    Payload: JSON.stringify({
      body: JSON.stringify({ text, language }),
    }),
  });
  
  const response = await lambdaClient.send(invokeCommand);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));
  return JSON.parse(payload.body);
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  console.log(`Request ${requestId}: ${event.httpMethod} ${event.path}`);
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { scheme_id, user_id, language = 'Hindi', include_voice = true } = body;
    
    if (!scheme_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ error: 'Missing scheme_id parameter' }),
      };
    }
    
    console.log(`Generating explanation for scheme: ${scheme_id}, language: ${language}`);
    
    // Get scheme details
    const schemeCommand = new GetCommand({
      TableName: SCHEMES_TABLE,
      Key: { scheme_id },
    });
    
    const schemeResult = await dynamoClient.send(schemeCommand);
    
    if (!schemeResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ error: 'Scheme not found' }),
      };
    }
    
    const scheme = schemeResult.Item;
    
    // Get user profile if provided
    let userProfile = null;
    if (user_id) {
      const userCommand = new GetCommand({
        TableName: USERS_TABLE,
        Key: { user_id },
      });
      
      const userResult = await dynamoClient.send(userCommand);
      userProfile = userResult.Item?.profile || null;
    }
    
    // Generate explanation
    const explanationPromptTemplate = await getExplanationPrompt();
    const explanationPrompt = explanationPromptTemplate
      .replace(/\{\{LANGUAGE\}\}/g, language)
      .replace('{{SCHEME_DETAILS}}', JSON.stringify(scheme, null, 2))
      .replace('{{USER_CONTEXT}}', JSON.stringify(userProfile || {}, null, 2));
    
    const explanation = await invokeBedrockWithRetry(
      'anthropic.claude-3-sonnet-20240229-v1:0',
      explanationPrompt,
      1500
    );
    
    // Translate if needed
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
    
    // Generate voice if requested
    let voiceData = null;
    if (include_voice) {
      try {
        voiceData = await generateVoice(translatedExplanation, language);
      } catch (error) {
        console.error('Voice generation failed:', error);
        // Continue without voice
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        scheme: {
          scheme_id: scheme.scheme_id,
          scheme_name: scheme.scheme_name,
          ministry: scheme.ministry,
        },
        explanation: translatedExplanation,
        language,
        voice: voiceData ? {
          audio_url: voiceData.audio_url,
          expires_in_seconds: voiceData.expires_in_seconds,
        } : null,
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
