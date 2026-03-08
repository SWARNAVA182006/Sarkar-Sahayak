# GovSaathi - Quick Start Guide

Get Phase 1 running in under 30 minutes.

## Prerequisites Checklist

- [ ] AWS Account with admin access
- [ ] AWS CLI configured (`aws sts get-caller-identity` works)
- [ ] Node.js 20.x installed (`node --version`)
- [ ] Bedrock model access enabled (Claude 3 Sonnet & Haiku)

## 5-Minute Setup

```bash
# 1. Install dependencies (2 min)
npm install
cd lambdas/scheme-ingestion && npm install && cd ../..
cd lambdas/api-handler && npm install && cd ../..

# 2. Build TypeScript (1 min)
npm run build

# 3. Bootstrap CDK (first time only) (2 min)
cdk bootstrap
```

## 10-Minute Deployment

```bash
# 4. Deploy Phase 1 (10 min)
npm run deploy:phase1

# Save the API URL from output!
```

## 5-Minute Configuration

```bash
# 5. Upload prompts (1 min)
bash scripts/upload-prompts.sh

# 6. Upload sample scheme (1 min)
bash scripts/upload-sample-scheme.sh

# 7. Wait for processing (30 sec)
sleep 30

# 8. Test API (1 min)
bash scripts/test-api.sh
```

## Verify Success

You should see:
```json
{
  "matched_schemes": [
    {
      "scheme_id": "PM-KISAN",
      "scheme_name": "Pradhan Mantri Kisan Samman Nidhi",
      "confidence_score": 0.85
    }
  ],
  "explanation": "यह योजना छोटे किसानों के लिए है...",
  "processing_time_ms": 2500
}
```

## What Just Happened?

1. **CDK deployed** 3 S3 buckets, 1 DynamoDB table, 2 Lambda functions, 1 API Gateway
2. **Prompts uploaded** to S3 for Bedrock to use
3. **Sample PDF processed** by Textract → Claude → DynamoDB
4. **API tested** with farmer query → matched PM-KISAN scheme → generated Hindi explanation

## Next Steps

### Add More Schemes

```bash
# Upload your own PDF
aws s3 cp your-scheme.pdf s3://$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='RawSchemesBucketName'].OutputValue" \
  --output text)/your-scheme.pdf
```

### Test Different Queries

```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a woman entrepreneur looking for business loans",
    "language": "English"
  }'
```

### Monitor Costs

```bash
bash scripts/check-costs.sh
```

### View Logs

```bash
# Processing logs
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow

# API logs
aws logs tail /aws/lambda/GovSaathi-ApiHandler --follow
```

## Troubleshooting

### "AccessDeniedException" from Bedrock

→ Enable model access in Bedrock console

### "No schemes found in database"

→ Wait 60 seconds for PDF processing, then retry

### API returns 404

→ Check you're using the full URL with `/prod/` prefix

### Lambda timeout

→ Check CloudWatch Logs for specific error

## Clean Up

When done:
```bash
bash scripts/cleanup.sh
```

## Full Documentation

- **Detailed deployment**: See DEPLOYMENT_GUIDE.md
- **Phase 1 checklist**: See PHASE1_CHECKLIST.md
- **Cost tracking**: See COST_TRACKING.md
- **Architecture**: See README.md

## Budget Status

Phase 1 should cost < $1 for testing.
Total budget: $150 across all 4 phases.

Check current spend:
```bash
bash scripts/check-costs.sh
```

## Demo Flow

For judges/stakeholders:

1. Show API Gateway URL
2. Send farmer query in Hindi
3. Receive matched scheme with explanation
4. Show DynamoDB table with parsed schemes
5. Show CloudWatch Logs with processing pipeline

**Phase 1 Complete!** 🎉

Ready for Phase 2? See README.md for semantic search implementation.
