import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PollyClient, SynthesizeSpeechCommand, VoiceId, Engine } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const pollyClient = new PollyClient({});
const s3Client = new S3Client({});

const AUDIO_BUCKET = process.env.AUDIO_BUCKET!;

// Supported Indian language voices
const VOICE_MAP: Record<string, VoiceId> = {
  Hindi: VoiceId.Aditi,
  English: VoiceId.Joanna,
  // Note: Polly doesn't have native Tamil, Telugu, Bengali voices
  // We'll use Aditi (Hindi) as fallback for Indian languages
  Tamil: VoiceId.Aditi,
  Telugu: VoiceId.Aditi,
  Bengali: VoiceId.Aditi,
  Marathi: VoiceId.Aditi,
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  console.log(`Request ${requestId}: ${event.httpMethod} ${event.path}`);
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { text, language = 'Hindi', voice_id } = body;
    
    if (!text) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ error: 'Missing text parameter' }),
      };
    }
    
    // Select voice
    const selectedVoice = voice_id || VOICE_MAP[language] || VoiceId.Aditi;
    
    console.log(`Generating speech for ${text.length} characters in ${language} using ${selectedVoice}`);
    
    // Synthesize speech with Polly
    const synthesizeCommand = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: selectedVoice,
      Engine: Engine.NEURAL, // Use neural engine for better quality
      LanguageCode: language === 'Hindi' ? 'hi-IN' : 'en-US',
    });
    
    const pollyResponse = await pollyClient.send(synthesizeCommand);
    
    if (!pollyResponse.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }
    
    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(pollyResponse.AudioStream);
    
    console.log(`Generated ${audioBuffer.length} bytes of audio`);
    
    // Store in S3
    const audioKey = `${requestId}.mp3`;
    await s3Client.send(new PutObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: audioKey,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    }));
    
    // Generate pre-signed URL (expires in 1 hour)
    const audioUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: AUDIO_BUCKET,
        Key: audioKey,
      }),
      { expiresIn: 3600 }
    );
    
    const processingTime = Date.now() - startTime;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        audio_key: audioKey,
        language,
        voice_id: selectedVoice,
        text_length: text.length,
        audio_size_bytes: audioBuffer.length,
        processing_time_ms: processingTime,
        expires_in_seconds: 3600,
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

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}
