import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ComprehendClient, DetectEntitiesCommand, DetectKeyPhrasesCommand } from '@aws-sdk/client-comprehend';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const comprehendClient = new ComprehendClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USERS_TABLE = process.env.USERS_TABLE!;

interface UserProfile {
  age?: number;
  gender?: string;
  occupation?: string;
  income?: number;
  state?: string;
  district?: string;
  caste_category?: string;
  land_ownership?: boolean;
  family_size?: number;
  [key: string]: any;
}

function extractProfileFromEntities(entities: any[], keyPhrases: any[], rawText: string): UserProfile {
  const profile: UserProfile = {};
  
  // Extract location entities
  const locations = entities.filter(e => e.Type === 'LOCATION');
  if (locations.length > 0) {
    profile.state = locations[0].Text;
    if (locations.length > 1) {
      profile.district = locations[1].Text;
    }
  }
  
  // Extract quantities (age, income, land size)
  const quantities = entities.filter(e => e.Type === 'QUANTITY');
  for (const qty of quantities) {
    const text = qty.Text.toLowerCase();
    if (text.includes('year') || text.includes('age')) {
      profile.age = parseInt(text.match(/\d+/)?.[0] || '0');
    } else if (text.includes('rupee') || text.includes('rs') || text.includes('income')) {
      profile.income = parseInt(text.match(/\d+/)?.[0] || '0');
    } else if (text.includes('hectare') || text.includes('acre')) {
      profile.land_ownership = true;
    }
  }
  
  // Extract occupation from key phrases
  const occupationKeywords = ['farmer', 'teacher', 'worker', 'student', 'entrepreneur', 'business'];
  for (const phrase of keyPhrases) {
    const text = phrase.Text.toLowerCase();
    for (const keyword of occupationKeywords) {
      if (text.includes(keyword)) {
        profile.occupation = keyword;
        break;
      }
    }
  }
  
  // Extract gender from text
  const lowerText = rawText.toLowerCase();
  if (lowerText.includes(' woman') || lowerText.includes(' female') || lowerText.includes(' girl')) {
    profile.gender = 'female';
  } else if (lowerText.includes(' man') || lowerText.includes(' male') || lowerText.includes(' boy')) {
    profile.gender = 'male';
  }
  
  // Extract caste category
  const casteKeywords = ['sc', 'st', 'obc', 'general', 'scheduled caste', 'scheduled tribe'];
  for (const keyword of casteKeywords) {
    if (lowerText.includes(keyword)) {
      profile.caste_category = keyword.toUpperCase();
      break;
    }
  }
  
  return profile;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  console.log(`Request ${requestId}: ${event.httpMethod} ${event.path}`);
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, description, manual_fields } = body;
    
    if (!description) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ error: 'Missing description parameter' }),
      };
    }
    
    console.log(`Processing profile for user: ${user_id || 'anonymous'}`);
    
    // Call Comprehend to extract entities
    const entitiesCommand = new DetectEntitiesCommand({
      Text: description,
      LanguageCode: 'en',
    });
    
    const entitiesResponse = await comprehendClient.send(entitiesCommand);
    
    // Call Comprehend to extract key phrases
    const keyPhrasesCommand = new DetectKeyPhrasesCommand({
      Text: description,
      LanguageCode: 'en',
    });
    
    const keyPhrasesResponse = await comprehendClient.send(keyPhrasesCommand);
    
    // Extract structured profile
    const extractedProfile = extractProfileFromEntities(
      entitiesResponse.Entities || [],
      keyPhrasesResponse.KeyPhrases || [],
      description
    );
    
    // Merge with manual fields if provided
    const finalProfile = {
      ...extractedProfile,
      ...manual_fields,
    };
    
    // Store in DynamoDB
    const userId = user_id || requestId;
    
    await dynamoClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        user_id: userId,
        profile: finalProfile,
        raw_description: description,
        entities: entitiesResponse.Entities,
        key_phrases: keyPhrasesResponse.KeyPhrases,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }));
    
    const processingTime = Date.now() - startTime;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        user_id: userId,
        profile: finalProfile,
        extracted_entities: entitiesResponse.Entities?.length || 0,
        extracted_key_phrases: keyPhrasesResponse.KeyPhrases?.length || 0,
        processing_time_ms: processingTime,
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
