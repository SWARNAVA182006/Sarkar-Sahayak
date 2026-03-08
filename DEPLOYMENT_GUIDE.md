# GovSaathi Deployment Guide

Complete step-by-step guide for deploying all phases of GovSaathi AI.

## Prerequisites

### Required Tools
- Node.js 20.x or later
- npm 10.x or later
- AWS CLI v2
- AWS CDK v2.133.0 or later
- Git
- Bash shell (Git Bash on Windows)

### AWS Account Setup

1. **Create AWS Account** (if needed)
   - Sign up at https://aws.amazon.com
   - Verify email and set up billing

2. **Enable Bedrock Model Access**
   - Navigate to Amazon Bedrock console
   - Go to "Model access" in left sidebar
   - Request access to:
     - Anthropic Claude 3 Sonnet
     - Anthropic Claude 3 Haiku
     - Amazon Titan Text Embeddings V2
   - Wait for approval (usually instant)

3. **Configure AWS CLI**
   ```bash
   aws configure
   ```
   Enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `us-east-1`
   - Default output format: `json`

4. **Verify Configuration**
   ```bash
   aws sts get-caller-identity
   aws bedrock list-foundation-models --region us-east-1
   ```

### Install CDK

```bash
npm install -g aws-cdk
cdk --version
```

## Phase 1 Deployment

### Step 1: Clone and Setup

```bash
# Clone repository (or navigate to project directory)
cd govsaathi

# Install dependencies
npm install

# Install Lambda dependencies
cd lambdas/scheme-ingestion && npm install && cd ../..
cd lambdas/api-handler && npm install && cd ../..
```

### Step 2: Build Project

```bash
npm run build
```

### Step 3: Bootstrap CDK (First Time Only)

```bash
cdk bootstrap
```

This creates:
- S3 bucket for CDK assets
- IAM roles for CloudFormation
- ECR repository (if needed)

### Step 4: Deploy Phase 1 Stack

```bash
npm run deploy:phase1
```

Expected output:
```
✅  Phase1Stack

Outputs:
Phase1Stack.ApiUrl = https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/
Phase1Stack.RawSchemesBucketName = govsaathi-schemes-raw-123456789012
Phase1Stack.ProcessedBucketName = govsaathi-processed-123456789012
Phase1Stack.PromptsBucketName = govsaathi-prompts-123456789012
Phase1Stack.SchemesTableName = GovSaathi-Schemes
```

Save these outputs for later use.

### Step 5: Upload Prompts

```bash
bash scripts/upload-prompts.sh
```

### Step 6: Upload Sample Scheme

```bash
bash scripts/upload-sample-scheme.sh
```

This triggers the Lambda function automatically.

### Step 7: Verify Processing

Wait 30-60 seconds, then check:

```bash
# Check Lambda logs
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow

# Verify DynamoDB
aws dynamodb scan --table-name GovSaathi-Schemes
```

### Step 8: Test API

```bash
bash scripts/test-api.sh
```

Or manually:

```bash
curl -X POST "https://YOUR_API_URL/match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a small farmer in Maharashtra",
    "language": "Hindi"
  }'
```

## Phase 2 Deployment (Coming Soon)

Phase 2 adds semantic search with embeddings.

```bash
npm run deploy:phase2
```

## Phase 3 Deployment (Coming Soon)

Phase 3 adds voice interface and document OCR.

```bash
npm run deploy:phase3
```

## Phase 4 Deployment (Coming Soon)

Phase 4 adds mobile frontend.

```bash
npm run deploy:phase4
```

## Monitoring

### CloudWatch Logs

```bash
# Textract Processor logs
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow

# API Handler logs
aws logs tail /aws/lambda/GovSaathi-ApiHandler --follow
```

### Cost Monitoring

```bash
bash scripts/check-costs.sh
```

### DynamoDB Data

```bash
# Scan all schemes
aws dynamodb scan --table-name GovSaathi-Schemes

# Get specific scheme
aws dynamodb get-item \
  --table-name GovSaathi-Schemes \
  --key '{"scheme_id": {"S": "PM-KISAN"}, "version": {"S": "2024-01-01T00:00:00.000Z"}}'
```

### S3 Contents

```bash
# List raw schemes
aws s3 ls s3://govsaathi-schemes-raw-YOUR_ACCOUNT_ID/

# List processed text
aws s3 ls s3://govsaathi-processed-YOUR_ACCOUNT_ID/

# List prompts
aws s3 ls s3://govsaathi-prompts-YOUR_ACCOUNT_ID/
```

## Troubleshooting

### Issue: CDK Deploy Fails

**Error:** "Unable to resolve AWS account"

**Solution:**
```bash
aws configure
aws sts get-caller-identity
```

### Issue: Bedrock Access Denied

**Error:** "AccessDeniedException: Could not access model"

**Solution:**
1. Go to Bedrock console
2. Enable model access for Claude 3 Sonnet and Haiku
3. Wait for approval
4. Retry deployment

### Issue: Lambda Timeout

**Error:** "Task timed out after 30.00 seconds"

**Solution:**
- Check CloudWatch Logs for specific error
- Verify Bedrock model access
- Check S3 prompt files exist
- Increase Lambda timeout in CDK stack

### Issue: API Returns 404

**Error:** "Missing Authentication Token"

**Solution:**
- Verify API Gateway URL includes `/prod/` prefix
- Check endpoint is `/match` not `/prod/prod/match`
- Ensure POST method is used

### Issue: No Schemes in DynamoDB

**Solution:**
1. Check Lambda was triggered:
   ```bash
   aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow
   ```
2. Verify PDF was uploaded to correct bucket
3. Check Lambda has DynamoDB write permissions
4. Re-upload PDF to trigger processing

## Cleanup

To avoid ongoing charges after the hackathon:

```bash
bash scripts/cleanup.sh
```

This will:
1. Destroy all CDK stacks
2. Delete S3 buckets and contents
3. Remove DynamoDB tables
4. Delete Lambda functions
5. Remove API Gateway

Verify cleanup:
```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE
aws s3 ls | grep govsaathi
```

## Cost Optimization

### During Development

1. **Use Haiku for Testing**
   - Switch to Claude 3 Haiku for non-critical tasks
   - 5x cheaper than Sonnet

2. **Limit Concurrent Executions**
   - Reserved concurrency set to 20
   - Prevents runaway costs

3. **Cache Prompts**
   - Prompts loaded once at Lambda cold start
   - Reduces S3 GET requests

4. **DynamoDB On-Demand**
   - Pay only for actual requests
   - No idle capacity charges

### After Demo

1. **Delete Unused Resources**
   ```bash
   bash scripts/cleanup.sh
   ```

2. **Set Budget Alerts**
   - AWS Budgets: $100 warning, $140 critical
   - SNS notifications to email

## Security Best Practices

1. **IAM Roles**
   - Lambda functions use least-privilege IAM roles
   - No hardcoded credentials

2. **S3 Encryption**
   - All buckets use SSE-S3 encryption
   - Versioning enabled for audit trail

3. **API Gateway**
   - CORS enabled for frontend
   - Rate limiting: 100 req/sec burst, 10 req/sec steady

4. **DynamoDB**
   - Encryption at rest enabled
   - Point-in-time recovery disabled (cost optimization)

5. **Secrets Management**
   - No API keys in code
   - Use AWS Systems Manager Parameter Store if needed

## Support

For issues:
1. Check CloudWatch Logs
2. Review PHASE1_CHECKLIST.md
3. Consult AWS documentation
4. Check AWS Service Health Dashboard

## Next Steps

After successful Phase 1 deployment:
1. Complete PHASE1_CHECKLIST.md
2. Update COST_TRACKING.md with actual costs
3. Review Phase 2 requirements
4. Plan semantic search implementation
