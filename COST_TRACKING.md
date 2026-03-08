# GovSaathi Cost Tracking

**Total Budget: $150**

## Phase 1 Budget: $25

### Estimated Costs

| Service | Usage | Unit Cost | Estimated Cost |
|---------|-------|-----------|----------------|
| Amazon Bedrock (Claude 3 Sonnet) | 10 scheme parses @ 1500 tokens output | $0.015/1K output tokens | $0.23 |
| Amazon Bedrock (Claude 3 Haiku) | 20 translations @ 800 tokens output | $0.00125/1K output tokens | $0.02 |
| Amazon Textract | 10 PDFs @ 5 pages each (DetectDocumentText) | $0.0015/page | $0.08 |
| Amazon S3 | 50 MB storage + 100 requests | $0.023/GB + $0.0004/1K requests | $0.01 |
| Amazon DynamoDB | 100 write requests, 500 read requests | $1.25/million writes, $0.25/million reads | $0.01 |
| AWS Lambda | 50 invocations @ 512MB, 10s avg | $0.0000166667/GB-second | $0.42 |
| Amazon API Gateway | 100 API calls | $3.50/million requests | $0.01 |
| **Phase 1 Total** | | | **~$0.78** |

### Cost Safety Margin

Phase 1 actual usage is expected to be under $1. The $25 allocation provides:
- 25x safety margin for testing and iteration
- Buffer for unexpected Bedrock token usage
- Room for multiple deployment cycles

### Cost Optimization Strategies

1. **Prompt Caching**: Load prompts once at Lambda cold start
2. **Exponential Backoff**: Retry logic prevents duplicate Bedrock calls
3. **DynamoDB On-Demand**: Pay only for actual requests
4. **S3 Lifecycle**: Move to IA storage after 7 days
5. **Lambda Reserved Concurrency**: Cap at 20 to prevent runaway costs

## Phase 2 Budget: $40

### Planned Services

| Service | Estimated Cost |
|---------|----------------|
| Amazon Bedrock (Titan Embeddings) | $5 |
| Amazon Bedrock (Claude re-ranking) | $15 |
| Amazon Comprehend | $8 |
| AWS Step Functions | $3 |
| Lambda (increased volume) | $5 |
| DynamoDB (50 schemes) | $2 |
| S3 (increased storage) | $2 |
| **Phase 2 Total** | **$40** |

## Phase 3 Budget: $30

### Planned Services

| Service | Estimated Cost |
|---------|----------------|
| Amazon Polly | $5 |
| Amazon Textract (AnalyzeDocument) | $10 |
| Amazon Cognito | $2 |
| Lambda (OCR processing) | $5 |
| S3 (audio files) | $3 |
| API Gateway (increased traffic) | $2 |
| CloudWatch (alarms) | $3 |
| **Phase 3 Total** | **$30** |

## Phase 4 Budget: $25

### Planned Services

| Service | Estimated Cost |
|---------|----------------|
| AWS Amplify | $4 |
| Lambda (frontend API) | $5 |
| DynamoDB (user data) | $3 |
| S3 (frontend assets) | $2 |
| API Gateway | $3 |
| CloudFront (optional) | $5 |
| Misc/Testing | $3 |
| **Phase 4 Total** | **$25** |

## Running Total

| Phase | Budget | Estimated Actual | Remaining |
|-------|--------|------------------|-----------|
| Phase 1 | $25 | ~$1 | $149 |
| Phase 2 | $40 | TBD | $109 |
| Phase 3 | $30 | TBD | $79 |
| Phase 4 | $25 | TBD | $54 |
| Contingency | $30 | - | $24 |

## Cost Monitoring

### CloudWatch Budget Alerts

1. **Warning Alert**: $100 spent
   - Action: Review usage patterns
   - Optimize high-cost services

2. **Critical Alert**: $140 spent
   - Action: Stop non-essential processing
   - Freeze new feature development
   - Focus on demo preparation

### Daily Cost Checks

```bash
# Check AWS Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://cost-filter.json
```

### Per-Service Cost Tracking

Monitor these high-cost services daily:
1. Amazon Bedrock (token usage)
2. Amazon Textract (page count)
3. AWS Lambda (invocation count + duration)
4. Amazon Comprehend (character count)

## Cost Reduction Strategies

### If Approaching Budget Limit

1. **Switch to Haiku**: Use Claude 3 Haiku for all non-critical tasks
2. **Reduce max_tokens**: Lower from 1500 to 1000 for Sonnet
3. **Batch Processing**: Group Bedrock calls to reduce overhead
4. **Cache Aggressively**: Store match results in DynamoDB with 24h TTL
5. **Limit Scheme Library**: Cap at 50 schemes instead of 100
6. **Disable Polly**: Text-only responses for Phase 3
7. **Skip OpenSearch**: Use in-memory vector search only

## Post-Hackathon Cleanup

To avoid ongoing charges:

```bash
# Destroy all stacks
cdk destroy --all

# Verify S3 buckets are empty
aws s3 ls

# Check for orphaned resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=GovSaathi
```

## Notes

- All costs are estimates based on AWS pricing as of March 2024
- Actual costs may vary based on usage patterns
- Budget includes 20% contingency buffer
- Monitor AWS Cost Explorer daily during development
