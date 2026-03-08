# Phase 3 - Voice & Documents

**Budget: $30 | Duration: Days 6-10**

## Overview

Phase 3 adds voice output, document OCR, and user authentication to make GovSaathi accessible and secure.

## New Features

### 1. Amazon Polly Voice Output
- Text-to-speech in Hindi (Aditi voice)
- Neural engine for natural-sounding speech
- MP3 audio files stored in S3
- Pre-signed URLs (1-hour expiration)
- Automatic cleanup after 48 hours

### 2. Document OCR (Textract AnalyzeDocument)
- Extract data from Aadhaar cards
- Extract data from ration cards
- Key-value pair extraction
- Automatic profile updates
- Support for JPG and PNG images

### 3. Amazon Cognito Authentication
- Email and phone number sign-up
- OTP verification
- JWT token-based API access
- Secure user management
- Password recovery

### 4. CloudWatch Cost Alerts
- SNS notifications
- Bedrock invocation monitoring
- Daily usage tracking
- Email alerts at thresholds

## Architecture Changes

### New AWS Services
- Amazon Polly (text-to-speech)
- Amazon Cognito (user authentication)
- Amazon SNS (alerts)
- CloudWatch Alarms (monitoring)

### New S3 Buckets
- `govsaathi-user-docs-*`: User document uploads (30-day retention)
- `govsaathi-audio-*`: Polly audio output (48-hour retention)

### New Lambda Functions
- **VoiceGenerator**: Polly integration
- **DocumentOcr**: Textract AnalyzeDocument
- **EnhancedApiHandler**: Scheme explanation with voice
- **UploadUrlGenerator**: Pre-signed S3 upload URLs

## Deployment

### Prerequisites
- Phase 1 and Phase 2 deployed
- Same AWS account and region
- Email address for SNS alerts

### Step 1: Deploy Phase 3 Stack

```bash
bash scripts/deploy-phase3.sh
```

This will:
- Install Lambda dependencies
- Build TypeScript
- Deploy Phase 3 CDK stack
- Create Cognito User Pool
- Set up CloudWatch Alarms
- Deploy new Lambda functions

### Step 2: Subscribe to Alerts

```bash
bash scripts/subscribe-to-alerts.sh
```

Enter your email and confirm the subscription.

### Step 3: Test APIs

```bash
bash scripts/test-phase3-api.sh
```

This creates a test user and tests all endpoints.

## API Endpoints

All Phase 3 endpoints require Cognito authentication.

### Authentication

**1. Sign Up**
```bash
aws cognito-idp sign-up \
  --client-id <CLIENT_ID> \
  --username user@example.com \
  --password Password123! \
  --user-attributes Name=email,Value=user@example.com
```

**2. Confirm Sign Up**
```bash
aws cognito-idp confirm-sign-up \
  --client-id <CLIENT_ID> \
  --username user@example.com \
  --confirmation-code <CODE_FROM_EMAIL>
```

**3. Sign In**
```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <CLIENT_ID> \
  --auth-parameters USERNAME=user@example.com,PASSWORD=Password123!
```

Returns JWT token for API calls.

### POST /voice

Generate voice output from text.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request:**
```json
{
  "text": "यह योजना छोटे किसानों के लिए है",
  "language": "Hindi"
}
```

**Response:**
```json
{
  "audio_url": "https://s3.amazonaws.com/...",
  "audio_key": "uuid.mp3",
  "language": "Hindi",
  "voice_id": "Aditi",
  "text_length": 45,
  "audio_size_bytes": 12345,
  "processing_time_ms": 850,
  "expires_in_seconds": 3600
}
```

### POST /explain

Get scheme explanation with optional voice output.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request:**
```json
{
  "scheme_id": "PM-KISAN",
  "user_id": "user-123",
  "language": "Hindi",
  "include_voice": true
}
```

**Response:**
```json
{
  "scheme": {
    "scheme_id": "PM-KISAN",
    "scheme_name": "Pradhan Mantri Kisan Samman Nidhi",
    "ministry": "Ministry of Agriculture"
  },
  "explanation": "यह योजना छोटे किसानों के लिए है...",
  "language": "Hindi",
  "voice": {
    "audio_url": "https://s3.amazonaws.com/...",
    "expires_in_seconds": 3600
  },
  "processing_time_ms": 3200
}
```

### POST /upload

Generate pre-signed URL for document upload.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request:**
```json
{
  "file_name": "aadhaar.jpg",
  "content_type": "image/jpeg",
  "user_id": "user-123"
}
```

**Response:**
```json
{
  "upload_url": "https://s3.amazonaws.com/...",
  "key": "user-123/1234567890-aadhaar.jpg"
}
```

**Usage:**
```bash
# Upload file using pre-signed URL
curl -X PUT "<upload_url>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @aadhaar.jpg
```

After upload, Lambda automatically processes the document and updates user profile.

## Document OCR

### Supported Documents
- Aadhaar Card (front side)
- Ration Card
- Income Certificate
- Any government ID with key-value pairs

### Extracted Fields
- Name
- Date of Birth
- Address
- ID Number (Aadhaar, ration card)
- Gender
- State
- District
- Pincode

### OCR Process
1. User uploads document via `/upload` endpoint
2. S3 triggers DocumentOcr Lambda
3. Textract AnalyzeDocument extracts key-value pairs
4. Lambda maps fields to user profile
5. DynamoDB Users table updated
6. User profile auto-filled for scheme matching

### Check OCR Results

```bash
# Get user profile with extracted data
aws dynamodb get-item \
  --table-name GovSaathi-Users \
  --key '{"user_id": {"S": "user-123"}}'
```

## Voice Output

### Supported Languages
- **Hindi**: Aditi (neural voice)
- **English**: Joanna (neural voice)
- **Tamil, Telugu, Bengali, Marathi**: Aditi (fallback)

Note: Polly doesn't have native voices for all Indian languages. We use Aditi (Hindi) as fallback.

### Voice Quality
- Neural engine for natural prosody
- MP3 format (compressed)
- Average 1 KB per second of speech
- Clear pronunciation of Hindi text

### Audio Storage
- Stored in S3 with 48-hour lifecycle
- Pre-signed URLs expire in 1 hour
- Automatic cleanup to save costs

## Cost Breakdown

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Amazon Polly | 100 requests @ 1000 chars | $5 |
| Textract AnalyzeDocument | 50 documents | $10 |
| Amazon Cognito | 100 users | $2 |
| Lambda | Increased invocations | $5 |
| S3 | User docs + audio | $3 |
| CloudWatch | Alarms + logs | $2 |
| SNS | Email notifications | $1 |
| API Gateway | Increased traffic | $2 |
| **Total** | | **$30** |

## Security Features

### Cognito User Pool
- Email/phone verification required
- Password policy: 8+ chars, lowercase, digits
- JWT tokens for API access
- Automatic token expiration
- Account recovery via email

### S3 Security
- Encryption at rest (SSE-S3)
- CORS configured for web access
- Pre-signed URLs with expiration
- Automatic object deletion

### API Gateway
- Cognito authorizer on all endpoints
- JWT validation
- Rate limiting (100 burst, 10 steady)
- Request logging

### Data Privacy
- No Aadhaar numbers stored (only extracted fields)
- User documents deleted after 30 days
- Audio files deleted after 48 hours
- Compliance with DPDP Act intent

## Monitoring

### CloudWatch Logs

```bash
# Voice Generator
aws logs tail /aws/lambda/GovSaathi-VoiceGenerator --follow

# Document OCR
aws logs tail /aws/lambda/GovSaathi-DocumentOcr --follow

# Enhanced API Handler
aws logs tail /aws/lambda/GovSaathi-EnhancedApiHandler --follow
```

### CloudWatch Alarms

**Bedrock Invocation Alarm**
- Threshold: 500 invocations/day
- Action: SNS notification
- Purpose: Prevent cost overruns

**To add more alarms:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name GovSaathi-HighCost \
  --alarm-description "Alert on high daily cost" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

### SNS Notifications

Check subscriptions:
```bash
aws sns list-subscriptions-by-topic \
  --topic-arn <TOPIC_ARN>
```

## Testing Scenarios

### Test 1: Voice Generation
```bash
# Get auth token
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <CLIENT_ID> \
  --auth-parameters USERNAME=test@example.com,PASSWORD=Test@123 \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Generate voice
curl -X POST "${API_URL}voice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "नमस्ते, यह एक परीक्षण है",
    "language": "Hindi"
  }'
```

### Test 2: Document Upload & OCR
```bash
# Get upload URL
UPLOAD_RESPONSE=$(curl -X POST "${API_URL}upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "aadhaar.jpg",
    "content_type": "image/jpeg",
    "user_id": "test-user"
  }')

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.upload_url')

# Upload document
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @sample-aadhaar.jpg

# Wait for processing (30 seconds)
sleep 30

# Check extracted data
aws dynamodb get-item \
  --table-name GovSaathi-Users \
  --key '{"user_id": {"S": "test-user"}}'
```

### Test 3: Scheme Explanation with Voice
```bash
curl -X POST "${API_URL}explain" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheme_id": "PM-KISAN",
    "language": "Hindi",
    "include_voice": true
  }'
```

## Troubleshooting

### Issue: Polly Voice Not Generated

**Check:**
1. Lambda has polly:SynthesizeSpeech permission
2. Text length < 3000 characters
3. Language code is valid

**Solution:**
```bash
# Test Polly directly
aws polly synthesize-speech \
  --text "नमस्ते" \
  --output-format mp3 \
  --voice-id Aditi \
  --language-code hi-IN \
  output.mp3
```

### Issue: Document OCR Failed

**Check:**
1. Image format (JPG or PNG)
2. Image size < 5 MB
3. Image quality (clear, not blurry)
4. Document type (Aadhaar, ration card)

**Solution:**
- Use high-quality scans
- Ensure good lighting
- Crop to document only
- Check CloudWatch Logs for errors

### Issue: Cognito Authentication Failed

**Check:**
1. User confirmed email/phone
2. Password meets policy
3. Client ID is correct
4. Auth flow is USER_PASSWORD_AUTH

**Solution:**
```bash
# Confirm user manually
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <POOL_ID> \
  --username user@example.com

# Reset password
aws cognito-idp admin-set-user-password \
  --user-pool-id <POOL_ID> \
  --username user@example.com \
  --password NewPassword123! \
  --permanent
```

### Issue: Pre-signed URL Expired

**Solution:**
- URLs expire in 1 hour (upload) or 1 hour (audio)
- Generate new URL if expired
- Download audio immediately after generation

## Best Practices

### 1. Voice Generation
- Keep text under 1000 characters for best quality
- Use proper Hindi Unicode text
- Cache audio files if reusing same text
- Monitor Polly character usage

### 2. Document OCR
- Use high-resolution images (300+ DPI)
- Ensure document is flat and well-lit
- Crop to document boundaries
- Validate extracted data before using

### 3. Authentication
- Use strong passwords
- Enable MFA for production
- Rotate JWT tokens regularly
- Implement refresh token flow

### 4. Cost Optimization
- Cache voice output for common phrases
- Batch document processing
- Set S3 lifecycle policies
- Monitor CloudWatch alarms

## Next Steps

After Phase 3 validation:
1. Test voice output quality
2. Validate OCR accuracy
3. Set up production Cognito pool
4. Configure email templates
5. Prepare for Phase 4 (Mobile Frontend)

## Phase 3 Checklist

- [ ] Phase 3 stack deployed
- [ ] Cognito User Pool created
- [ ] Test user created and authenticated
- [ ] Voice generation tested
- [ ] Document OCR tested
- [ ] CloudWatch alarms configured
- [ ] SNS alerts subscribed
- [ ] Cost tracking updated
- [ ] Security review complete
- [ ] Ready for Phase 4

---

**Phase 3 Status:** Ready for deployment  
**Estimated Cost:** $30  
**Key Features:** Voice output, Document OCR, Authentication  
**Security:** Cognito JWT, S3 encryption, CORS configured
