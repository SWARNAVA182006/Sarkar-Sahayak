# Getting Started with GovSaathi

Welcome! This guide will help you get GovSaathi up and running.

## 📋 Prerequisites

Before you begin, ensure you have:

### Required
- [ ] AWS Account with admin access
- [ ] AWS CLI v2 installed and configured
- [ ] Node.js 20.x or later
- [ ] npm 10.x or later
- [ ] Git
- [ ] Bash shell (Git Bash on Windows)

### AWS Setup
- [ ] Bedrock model access enabled:
  - [ ] Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0)
  - [ ] Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0)
- [ ] Default region set (us-east-1 recommended)
- [ ] IAM user with admin permissions

## 🚀 Installation

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd govsaathi
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install Lambda dependencies
cd lambdas/scheme-ingestion && npm install && cd ../..
cd lambdas/api-handler && npm install && cd ../..
```

### Step 3: Build TypeScript

```bash
npm run build
```

### Step 4: Configure AWS

```bash
# Verify AWS CLI is configured
aws sts get-caller-identity

# Verify Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

## 🏗️ Deployment

### Step 5: Bootstrap CDK (First Time Only)

```bash
cdk bootstrap
```

This creates the necessary AWS resources for CDK deployments.

### Step 6: Deploy Phase 1

```bash
npm run deploy:phase1
```

This will:
- Create 3 S3 buckets
- Create 1 DynamoDB table
- Deploy 2 Lambda functions
- Set up API Gateway
- Configure IAM roles

**Expected time:** 10 minutes

Save the outputs:
```
Phase1Stack.ApiUrl = https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/
Phase1Stack.RawSchemesBucketName = govsaathi-schemes-raw-123456789012
...
```

### Step 7: Upload Configuration

```bash
# Upload Bedrock prompts
bash scripts/upload-prompts.sh

# Upload sample scheme
bash scripts/upload-sample-scheme.sh
```

### Step 8: Verify Deployment

```bash
# Wait 30 seconds for processing
sleep 30

# Check Lambda logs
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow

# Verify DynamoDB
aws dynamodb scan --table-name GovSaathi-Schemes
```

## 🧪 Testing

### Step 9: Test API

```bash
bash scripts/test-api.sh
```

Expected output:
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

### Manual Testing

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

# Test with curl
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a small farmer in Maharashtra",
    "language": "Hindi"
  }'
```

## 📊 Monitoring

### Check Costs

```bash
bash scripts/check-costs.sh
```

### View Logs

```bash
# Textract Processor
aws logs tail /aws/lambda/GovSaathi-TextractProcessor --follow

# API Handler
aws logs tail /aws/lambda/GovSaathi-ApiHandler --follow
```

### Inspect Data

```bash
# List schemes in DynamoDB
aws dynamodb scan --table-name GovSaathi-Schemes

# List S3 objects
aws s3 ls s3://govsaathi-schemes-raw-YOUR_ACCOUNT_ID/
```

## 🎯 What's Next?

### Add More Schemes

```bash
# Upload your own PDF
aws s3 cp your-scheme.pdf s3://YOUR_RAW_BUCKET/your-scheme.pdf
```

### Customize Prompts

1. Edit files in `prompts/` directory
2. Re-upload: `bash scripts/upload-prompts.sh`
3. Test changes

### Modify Lambda Functions

1. Edit `lambdas/*/index.ts`
2. Build: `npm run build`
3. Deploy: `npm run deploy:phase1`

## 🐛 Troubleshooting

### Issue: "AccessDeniedException" from Bedrock

**Solution:**
1. Go to Bedrock console
2. Click "Model access" in sidebar
3. Enable Claude 3 Sonnet and Haiku
4. Wait for approval (usually instant)

### Issue: "No schemes found in database"

**Solution:**
1. Check Lambda logs for processing errors
2. Verify PDF was uploaded to correct bucket
3. Wait 60 seconds for processing
4. Re-upload if needed

### Issue: API returns 404

**Solution:**
- Verify URL includes `/prod/` prefix
- Check endpoint is `/match`
- Ensure POST method is used

### Issue: Lambda timeout

**Solution:**
1. Check CloudWatch Logs for specific error
2. Verify Bedrock model access
3. Check S3 prompt files exist
4. Increase timeout in CDK stack if needed

## 🧹 Cleanup

When done testing:

```bash
bash scripts/cleanup.sh
```

This will destroy all AWS resources to avoid ongoing charges.

## 📚 Learn More

### Documentation
- [README.md](README.md) - Project overview
- [QUICKSTART.md](QUICKSTART.md) - Fast setup
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed steps
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design

### Key Concepts

**Bedrock Prompts:** Templates stored in S3 that guide Claude's responses

**DynamoDB Schema:** Schemes table with scheme_id (PK) and version (SK)

**Lambda Triggers:** S3 events automatically trigger processing

**Cost Optimization:** Prompt caching, on-demand billing, lifecycle policies

## 💡 Tips

1. **Start Small:** Test with 1-2 schemes before scaling
2. **Monitor Costs:** Check daily with `bash scripts/check-costs.sh`
3. **Use Logs:** CloudWatch Logs are your friend for debugging
4. **Test Locally:** Use `npm test` to run unit tests
5. **Read Docs:** Each markdown file has specific information

## 🎓 Understanding the Flow

### Scheme Ingestion
```
PDF Upload → S3 → Lambda → Textract → Claude → DynamoDB
```

### User Query
```
User → API Gateway → Lambda → DynamoDB + Claude → Response
```

### Cost Flow
```
Bedrock (tokens) > Lambda (compute) > Textract (pages) > S3/DynamoDB (storage)
```

## ✅ Success Checklist

- [ ] AWS CLI configured
- [ ] Dependencies installed
- [ ] TypeScript built
- [ ] CDK bootstrapped
- [ ] Phase 1 deployed
- [ ] Prompts uploaded
- [ ] Sample scheme uploaded
- [ ] API tested successfully
- [ ] Costs verified (< $1)
- [ ] CloudWatch Logs reviewed

## 🆘 Getting Help

1. **Check Logs:** CloudWatch Logs show detailed errors
2. **Review Docs:** Most issues are covered in documentation
3. **AWS Console:** Verify resources were created correctly
4. **Cost Explorer:** Monitor spending in real-time

## 🎉 You're Ready!

Once all steps are complete, you have:
- ✅ Working AI-powered scheme matching API
- ✅ Automated PDF processing pipeline
- ✅ Multilingual explanation generation
- ✅ Cost-optimized serverless architecture

**Next:** Explore Phase 2 features or customize for your use case!

---

**Questions?** Check [INDEX.md](INDEX.md) for a complete file reference.
