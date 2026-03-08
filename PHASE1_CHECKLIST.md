# Phase 1 - 24-Hour MVP Checklist

**Budget: $25 | Duration: Hours 0-24**

## Pre-Deployment

- [ ] AWS CLI configured with credentials
- [ ] AWS CDK installed (`npm install -g aws-cdk`)
- [ ] Node.js 20.x installed
- [ ] Bedrock model access enabled in AWS Console
  - [ ] Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0)
  - [ ] Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0)
- [ ] AWS region set (default: us-east-1)

## Deployment Steps

### 1. Install Dependencies (5 minutes)

```bash
npm install
cd lambdas/scheme-ingestion && npm install && cd ../..
cd lambdas/api-handler && npm install && cd ../..
```

- [ ] Root dependencies installed
- [ ] Lambda dependencies installed

### 2. Build TypeScript (2 minutes)

```bash
npm run build
```

- [ ] TypeScript compiled without errors
- [ ] No type errors in output

### 3. Bootstrap CDK (first time only)

```bash
cdk bootstrap
```

- [ ] CDK bootstrap complete
- [ ] S3 staging bucket created

### 4. Deploy Phase 1 Stack (10 minutes)

```bash
npm run deploy:phase1
```

- [ ] Stack deployment successful
- [ ] All resources created:
  - [ ] S3 buckets (raw, processed, prompts)
  - [ ] DynamoDB table (Schemes)
  - [ ] Lambda functions (TextractProcessor, ApiHandler)
  - [ ] API Gateway
- [ ] Stack outputs displayed:
  - [ ] ApiUrl
  - [ ] RawSchemesBucketName
  - [ ] ProcessedBucketName
  - [ ] PromptsBucketName
  - [ ] SchemesTableName

### 5. Upload Prompts (2 minutes)

```bash
bash scripts/upload-prompts.sh
```

- [ ] All 5 prompt files uploaded to S3
- [ ] Verify in S3 console or CLI

### 6. Upload Sample Scheme (3 minutes)

```bash
bash scripts/upload-sample-scheme.sh
```

- [ ] PM-KISAN sample uploaded
- [ ] Lambda triggered automatically
- [ ] Check CloudWatch Logs for processing

### 7. Verify Processing (5 minutes)

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow
```

- [ ] Textract extraction successful
- [ ] Raw text stored in processed bucket
- [ ] Claude parsing successful
- [ ] Scheme stored in DynamoDB

Verify DynamoDB:
```bash
aws dynamodb scan --table-name GovSaathi-Schemes
```

- [ ] PM-KISAN scheme present
- [ ] All fields populated correctly

### 8. Test API (5 minutes)

```bash
bash scripts/test-api.sh
```

- [ ] Test 1 (English) returns 200 OK
- [ ] Test 2 (Hindi) returns 200 OK
- [ ] Response includes:
  - [ ] matched_schemes array
  - [ ] explanation text
  - [ ] processing_time_ms
  - [ ] bedrock_model_used
  - [ ] request_id

### 9. Manual API Test with Postman/curl

```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a small farmer in Maharashtra with 1.5 hectares of land",
    "language": "Hindi"
  }'
```

- [ ] API responds within 5 seconds
- [ ] Hindi explanation is readable
- [ ] Scheme name is PM-KISAN

## Validation Criteria

### Functional Requirements
- [ ] PDF upload triggers automatic processing
- [ ] Textract extracts text from PDF
- [ ] Claude parses scheme into structured JSON
- [ ] DynamoDB stores scheme data
- [ ] API accepts POST /match requests
- [ ] API returns matched scheme
- [ ] Explanation generated in target language

### Performance Requirements
- [ ] Lambda cold start < 3 seconds
- [ ] API response time < 5 seconds (p95)
- [ ] Textract processing < 30 seconds per PDF

### Cost Requirements
- [ ] Check current spend: `bash scripts/check-costs.sh`
- [ ] Estimated Phase 1 cost < $5
- [ ] No unexpected charges

## Troubleshooting

### Lambda Fails to Process PDF

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow
```

Common issues:
- Bedrock model access not enabled
- IAM permissions missing
- Prompt file not found in S3

### API Returns 500 Error

Check API Handler logs:
```bash
aws logs tail /aws/lambda/GovSaathi-ApiHandler --follow
```

Common issues:
- No schemes in DynamoDB
- Bedrock throttling
- Prompt template not found

### Bedrock ThrottlingException

- Wait 1 minute and retry
- Check Bedrock quotas in AWS Console
- Reduce concurrent Lambda invocations

## Phase 1 Deliverable

**Screenshot Proof Required:**
1. API Gateway URL from CDK output
2. Postman/curl request showing farmer query
3. API response with Hindi explanation
4. DynamoDB table showing PM-KISAN scheme
5. CloudWatch Logs showing successful processing

## Cost Summary

After Phase 1 completion, run:
```bash
bash scripts/check-costs.sh
```

Expected costs:
- Bedrock: ~$0.25
- Textract: ~$0.08
- Lambda: ~$0.42
- S3: ~$0.01
- DynamoDB: ~$0.01
- API Gateway: ~$0.01

**Total: ~$0.78 (well under $25 budget)**

## Next Steps

Once Phase 1 is validated:
- [ ] Document any issues encountered
- [ ] Update cost tracking spreadsheet
- [ ] Prepare for Phase 2 (Semantic Matching Engine)
- [ ] Review Phase 2 requirements and budget

## Sign-Off

- [ ] All checklist items complete
- [ ] Demo flow works end-to-end
- [ ] Cost tracking updated
- [ ] Ready to proceed to Phase 2

**Phase 1 Completion Date:** _______________
**Actual Cost:** $_______________
**Issues Encountered:** _______________
