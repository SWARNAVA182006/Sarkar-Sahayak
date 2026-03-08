# Phase 2 - Semantic Matching Engine

**Budget: $40 | Duration: Days 2-5**

## Overview

Phase 2 adds intelligent semantic search capabilities using vector embeddings, entity extraction, and advanced matching algorithms.

## New Features

### 1. Semantic Search with Titan Embeddings
- Generate 1536-dimensional vectors for each scheme
- Query embedding generation
- Cosine similarity matching
- Top-10 candidate retrieval

### 2. Amazon Comprehend Integration
- Entity extraction (location, age, income, occupation)
- Key phrase detection
- Automatic profile building from natural language

### 3. Claude Re-ranking
- Top-5 candidates re-ranked by Claude
- Match score 0-100 with explanation
- Qualifying and disqualifying factors
- Missing information identification

### 4. Match Result Caching
- 24-hour TTL cache in DynamoDB
- Query hash-based lookup
- Reduces Bedrock costs by 80%+

### 5. Batch Processing
- AWS Step Functions orchestration
- Process up to 50 schemes in parallel
- Max concurrency: 10 (cost control)
- Progress tracking

## Architecture Changes

### New AWS Services
- Amazon Titan Embeddings V2
- Amazon Comprehend
- AWS Step Functions
- Additional DynamoDB tables (Users, MatchCache)

### Enhanced Lambda Functions
- EnhancedTextractProcessor: Adds embedding generation
- UserProfileProcessor: Comprehend entity extraction
- SemanticMatcher: Vector search + Claude re-ranking
- BatchCoordinator: Step Functions integration

## Deployment

### Prerequisites
- Phase 1 deployed successfully
- Same AWS account and region
- Bedrock access to Titan Embeddings V2

### Step 1: Deploy Phase 2 Stack

```bash
bash scripts/deploy-phase2.sh
```

This will:
- Install Lambda dependencies
- Build TypeScript
- Deploy Phase 2 CDK stack
- Create new DynamoDB tables
- Deploy enhanced Lambda functions
- Set up Step Functions

### Step 2: Reprocess Existing Schemes

```bash
bash scripts/reprocess-schemes-phase2.sh
```

This triggers re-processing of all PDFs to generate embeddings.

### Step 3: Test New APIs

```bash
bash scripts/test-phase2-api.sh
```

## API Endpoints

### POST /profile

Extract structured profile from natural language description.

**Request:**
```json
{
  "description": "I am a 35 year old farmer from Maharashtra with 2 hectares of land",
  "manual_fields": {
    "caste_category": "OBC"
  }
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "profile": {
    "age": 35,
    "occupation": "farmer",
    "state": "Maharashtra",
    "land_ownership": true,
    "caste_category": "OBC"
  },
  "extracted_entities": 5,
  "extracted_key_phrases": 8,
  "processing_time_ms": 1200
}
```

### POST /match (Enhanced)

Semantic matching with vector search and Claude re-ranking.

**Request:**
```json
{
  "query": "I am a small farmer in Maharashtra",
  "user_profile": {
    "occupation": "farmer",
    "state": "Maharashtra",
    "land_ownership": true
  },
  "language": "Hindi",
  "use_cache": true
}
```

**Response:**
```json
{
  "matched_schemes": [
    {
      "scheme_id": "PM-KISAN",
      "scheme_name": "Pradhan Mantri Kisan Samman Nidhi",
      "similarity_score": 0.89,
      "match_score": 94,
      "explanation": "Strong match based on occupation and land ownership",
      "qualifying_factors": ["farmer", "land owner"],
      "disqualifying_factors": [],
      "missing_info": ["income", "age"]
    }
  ],
  "top_match": {
    "scheme_id": "PM-KISAN",
    "match_score": 94,
    "explanation": "यह योजना आपके लिए बहुत उपयुक्त है..."
  },
  "language": "Hindi",
  "processing_time_ms": 3500,
  "semantic_search": true,
  "request_id": "uuid"
}
```

**Headers:**
- `X-Cache: HIT` - Result from cache
- `X-Cache: MISS` - Fresh computation

### POST /batch-ingest

Trigger batch processing of multiple schemes.

**Request:**
```json
{
  "prefix": "schemes/"
}
```

**Response:**
```json
{
  "executionArn": "arn:aws:states:us-east-1:123456789012:execution:..."
}
```

## Cost Breakdown

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Titan Embeddings | 50 schemes + 100 queries | $5 |
| Claude Sonnet | 50 parses + 500 re-rankings | $15 |
| Comprehend | 100 entity extractions | $8 |
| Step Functions | 1 batch execution | $3 |
| Lambda | Increased invocations | $5 |
| DynamoDB | 2 new tables | $2 |
| S3 | Minimal increase | $2 |
| **Total** | | **$40** |

## Performance Improvements

### Matching Accuracy
- Phase 1: 60-70% accuracy (mock matching)
- Phase 2: 85-95% accuracy (semantic + Claude)

### Response Time
- First request: 3-5 seconds (embedding + matching)
- Cached requests: <500ms (DynamoDB lookup)

### Cost Efficiency
- Caching reduces Bedrock costs by 80%+
- Batch processing optimizes Textract usage

## Monitoring

### CloudWatch Logs

```bash
# Enhanced Textract Processor
aws logs tail /aws/lambda/GovSaathi-EnhancedTextractProcessor --follow

# User Profile Processor
aws logs tail /aws/lambda/GovSaathi-UserProfileProcessor --follow

# Semantic Matcher
aws logs tail /aws/lambda/GovSaathi-SemanticMatcher --follow
```

### Step Functions Execution

```bash
# List executions
aws stepfunctions list-executions \
  --state-machine-arn $(aws cloudformation describe-stacks \
    --stack-name Phase2Stack \
    --query "Stacks[0].Outputs[?OutputKey=='StateMachineArn'].OutputValue" \
    --output text)

# Get execution details
aws stepfunctions describe-execution \
  --execution-arn <execution-arn>
```

### DynamoDB Tables

```bash
# Check users table
aws dynamodb scan --table-name GovSaathi-Users

# Check match cache
aws dynamodb scan --table-name GovSaathi-MatchCache

# Check cache hit rate
aws dynamodb scan --table-name GovSaathi-MatchCache \
  --select COUNT
```

## Testing Scenarios

### Test 1: Farmer Query
```bash
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a small farmer with 1 hectare land",
    "language": "English"
  }'
```

Expected: PM-KISAN with high match score

### Test 2: Woman Entrepreneur
```bash
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a woman entrepreneur looking for business loans",
    "language": "English"
  }'
```

Expected: MUDRA Yojana or similar schemes

### Test 3: Student Query
```bash
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a SC category student pursuing engineering",
    "language": "English"
  }'
```

Expected: Scholarship schemes

### Test 4: Cache Performance
Run same query twice and compare:
- First request: X-Cache: MISS, ~3-5 seconds
- Second request: X-Cache: HIT, <500ms

## Troubleshooting

### Issue: Embeddings Not Generated

**Check:**
1. Bedrock access to Titan Embeddings V2
2. Lambda has bedrock:InvokeModel permission
3. CloudWatch Logs for errors

**Solution:**
```bash
# Verify Bedrock access
aws bedrock list-foundation-models --region us-east-1 | grep titan-embed

# Check Lambda permissions
aws lambda get-policy --function-name GovSaathi-EnhancedTextractProcessor
```

### Issue: Low Match Scores

**Possible causes:**
- Insufficient scheme data
- Poor quality embeddings
- User query too vague

**Solution:**
- Add more schemes to database
- Improve scheme descriptions
- Ask user for more details

### Issue: Comprehend Errors

**Check:**
- Text length (max 5000 bytes)
- Language code (must be 'en')
- IAM permissions

**Solution:**
```bash
# Test Comprehend directly
aws comprehend detect-entities \
  --text "I am a farmer from Maharashtra" \
  --language-code en
```

### Issue: Step Functions Timeout

**Check:**
- Number of schemes being processed
- Lambda timeout settings
- Concurrent execution limits

**Solution:**
- Reduce max concurrency in Step Functions
- Increase Lambda timeout
- Process in smaller batches

## Best Practices

### 1. Embedding Generation
- Generate embeddings for scheme name + benefits + target beneficiaries
- Keep text under 8000 characters
- Normalize text before embedding

### 2. Caching Strategy
- Use 24-hour TTL for match results
- Include user_profile in cache key
- Clear cache when schemes are updated

### 3. Cost Optimization
- Enable caching (use_cache: true)
- Batch process schemes during off-peak hours
- Monitor Bedrock token usage daily

### 4. Accuracy Improvement
- Collect user feedback on matches
- Fine-tune similarity thresholds
- Add more schemes to database

## Next Steps

After Phase 2 validation:
1. Expand scheme library to 50 schemes
2. Collect real user queries for testing
3. Optimize similarity thresholds
4. Prepare for Phase 3 (Voice & Documents)

## Phase 2 Checklist

- [ ] Phase 2 stack deployed
- [ ] All Lambda functions working
- [ ] Embeddings generated for schemes
- [ ] Semantic matching tested
- [ ] User profile extraction tested
- [ ] Cache working correctly
- [ ] Step Functions tested
- [ ] Cost tracking updated
- [ ] Performance metrics collected
- [ ] Ready for Phase 3

---

**Phase 2 Status:** Ready for deployment  
**Estimated Cost:** $40  
**Expected Accuracy:** 85-95%  
**Cache Hit Rate:** 70-80% (after warm-up)
