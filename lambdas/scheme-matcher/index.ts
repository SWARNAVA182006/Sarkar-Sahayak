import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createHash, randomUUID } from 'crypto';

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const SCHEMES_TABLE = process.env.SCHEMES_TABLE!;
const MATCH_CACHE_TABLE = process.env.MATCH_CACHE_TABLE!;
const PROMPTS_BUCKET = process.env.PROMPTS_BUCKET!;

let cachedRankerPrompt: string | null = null;
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

async function getRankerPrompt(): Promise<string> {
  if (!cachedRankerPrompt) {
    cachedRankerPrompt = await loadPrompt('eligibility-ranker');
  }
  return cachedRankerPrompt;
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

async function generateEmbedding(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: text.substring(0, 8000),
    }),
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
    const body = JSON.parse(event.body || '{}');
    const { query, user_profile, language = 'Hindi', use_cache = true } = body;
    
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
    
    // Check cache
    const queryHash = createHash('sha256').update(query + JSON.stringify(user_profile || {})).digest('hex');
    
    if (use_cache) {
      const cacheCommand = new GetCommand({
        TableName: MATCH_CACHE_TABLE,
        Key: { query_hash: queryHash },
      });
      
      const cacheResult = await dynamoClient.send(cacheCommand);
      
      if (cacheResult.Item && cacheResult.Item.ttl > Math.floor(Date.now() / 1000)) {
        console.log('Cache hit!');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
            'X-Cache': 'HIT',
          },
          body: JSON.stringify({
            ...cacheResult.Item.result,
            cached: true,
            request_id: requestId,
          }),
        };
      }
    }
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions`);
    
    // Scan all schemes and calculate similarity
    const scanCommand = new ScanCommand({
      TableName: SCHEMES_TABLE,
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
    
    // Calculate cosine similarity for each scheme
    const schemesWithScores = scanResult.Items.map(scheme => {
      const schemeEmbedding = JSON.parse(scheme.embedding || '[]');
      const similarity = cosineSimilarity(queryEmbedding, schemeEmbedding);
      
      return {
        ...scheme,
        similarity_score: similarity,
      };
    });
    
    // Sort by similarity and take top 10
    const topSchemes = schemesWithScores
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 10);
    
    console.log(`Top scheme: ${topSchemes[0].scheme_name} with similarity ${topSchemes[0].similarity_score}`);
    
    // Re-rank top 10 with Claude
    const rankerPromptTemplate = await getRankerPrompt();
    const rerankedSchemes = [];
    
    for (const scheme of topSchemes.slice(0, 5)) { // Re-rank top 5 to save costs
      const rankerPrompt = rankerPromptTemplate
        .replace('{{USER_PROFILE}}', JSON.stringify(user_profile || { query }, null, 2))
        .replace('{{SCHEME_CRITERIA}}', JSON.stringify(scheme.eligibility_criteria || [], null, 2));
      
      const rankerResponse = await invokeBedrockWithRetry(
        'anthropic.claude-3-sonnet-20240229-v1:0',
        rankerPrompt,
        1500
      );
      
      const rankerResult = JSON.parse(rankerResponse);
      
      rerankedSchemes.push({
        scheme_id: scheme.scheme_id,
        scheme_name: scheme.scheme_name,
        ministry: scheme.ministry,
        similarity_score: scheme.similarity_score,
        match_score: rankerResult.match_score,
        explanation: rankerResult.explanation,
        qualifying_factors: rankerResult.qualifying_factors,
        disqualifying_factors: rankerResult.disqualifying_factors,
        missing_info: rankerResult.missing_info,
      });
    }
    
    // Sort by match score
    rerankedSchemes.sort((a, b) => b.match_score - a.match_score);
    
    // Generate explanation for top match
    const topMatch = rerankedSchemes[0];
    const explanationPromptTemplate = await getExplanationPrompt();
    const explanationPrompt = explanationPromptTemplate
      .replace(/\{\{LANGUAGE\}\}/g, language)
      .replace('{{SCHEME_DETAILS}}', JSON.stringify(topMatch, null, 2))
      .replace('{{USER_CONTEXT}}', query);
    
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
    
    const processingTime = Date.now() - startTime;
    
    const result = {
      matched_schemes: rerankedSchemes,
      top_match: {
        ...topMatch,
        explanation: translatedExplanation,
      },
      language,
      processing_time_ms: processingTime,
      bedrock_model_used: 'titan-embed-v2 + claude-3-sonnet + claude-3-haiku',
      semantic_search: true,
      request_id: requestId,
    };
    
    // Cache result
    await dynamoClient.send(new PutCommand({
      TableName: MATCH_CACHE_TABLE,
      Item: {
        query_hash: queryHash,
        result,
        ttl: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        created_at: new Date().toISOString(),
      },
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Cache': 'MISS',
      },
      body: JSON.stringify(result),
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
