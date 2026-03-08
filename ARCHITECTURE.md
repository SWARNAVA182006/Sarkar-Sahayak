# GovSaathi Architecture

## Phase 1 - System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GovSaathi Phase 1 MVP                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        SCHEME INGESTION PIPELINE                      │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │ Government  │
    │ Scheme PDF  │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────┐
    │  S3: Raw Schemes    │
    │  govsaathi-raw-*    │
    └──────┬──────────────┘
           │ S3 Event Trigger
           ▼
    ┌─────────────────────────────────┐
    │  Lambda: Textract Processor     │
    │  - Extract text from PDF        │
    │  - Call Bedrock Claude Sonnet   │
    │  - Parse to structured JSON     │
    └──────┬──────────────────────────┘
           │
           ├──────────────────┐
           │                  │
           ▼                  ▼
    ┌─────────────┐    ┌──────────────────┐
    │ S3: Processed│    │ DynamoDB: Schemes│
    │ Text Files   │    │ - scheme_id (PK) │
    └──────────────┘    │ - version (SK)   │
                        │ - Parsed JSON    │
                        └──────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        USER QUERY PIPELINE                            │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   Mobile    │
    │   User      │
    └──────┬──────┘
           │ POST /match
           │ {"query": "I am a farmer...", "language": "Hindi"}
           ▼
    ┌─────────────────────┐
    │  API Gateway        │
    │  /prod/match        │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────────────────────┐
    │  Lambda: API Handler                │
    │  1. Scan DynamoDB for schemes       │
    │  2. Mock match (Phase 1)            │
    │  3. Generate explanation (Claude)   │
    │  4. Translate to Hindi (Claude)     │
    └──────┬──────────────────────────────┘
           │
           ├──────────────────┬─────────────────┐
           │                  │                 │
           ▼                  ▼                 ▼
    ┌──────────────┐   ┌─────────────┐  ┌──────────────┐
    │  DynamoDB    │   │  Bedrock    │  │  S3: Prompts │
    │  Read Schemes│   │  Claude 3   │  │  Templates   │
    └──────────────┘   │  Sonnet     │  └──────────────┘
                       │  + Haiku    │
                       └─────────────┘
           │
           ▼
    ┌─────────────────────────────────┐
    │  JSON Response                  │
    │  - matched_schemes[]            │
    │  - explanation (Hindi)          │
    │  - confidence_score             │
    │  - processing_time_ms           │
    └─────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        AWS SERVICES USED                              │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Amazon S3     │  │   DynamoDB      │  │  AWS Lambda     │
│                 │  │                 │  │                 │
│ - Raw PDFs      │  │ - Schemes Table │  │ - Textract Proc │
│ - Processed     │  │ - On-demand     │  │ - API Handler   │
│ - Prompts       │  │ - Encrypted     │  │ - Node.js 20.x  │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  API Gateway    │  │ Amazon Bedrock  │  │ Amazon Textract │
│                 │  │                 │  │                 │
│ - REST API      │  │ - Claude Sonnet │  │ - PDF Extract   │
│ - Rate Limit    │  │ - Claude Haiku  │  │ - Text Only     │
│ - CORS          │  │ - Max 1500 tok  │  │ - Cost Optimized│
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        DATA MODELS                                    │
└──────────────────────────────────────────────────────────────────────┘

DynamoDB: Schemes Table
┌────────────────────────────────────────────────────────────────┐
│ scheme_id (PK)          : string                               │
│ version (SK)            : ISO timestamp                        │
│ scheme_name             : string                               │
│ ministry                : string                               │
│ target_beneficiaries    : string[]                             │
│ eligibility_criteria    : {field, operator, value}[]           │
│ benefits                : string[]                             │
│ application_steps       : string[]                             │
│ documents_required      : string[]                             │
│ official_url            : string | null                        │
│ raw_text_s3_key         : string                               │
│ pdf_s3_key              : string                               │
│ processed_at            : ISO timestamp                        │
└────────────────────────────────────────────────────────────────┘

API Request
┌────────────────────────────────────────────────────────────────┐
│ query                   : string (user's situation)            │
│ language                : string (Hindi, English, etc.)        │
└────────────────────────────────────────────────────────────────┘

API Response
┌────────────────────────────────────────────────────────────────┐
│ matched_schemes         : {scheme_id, name, score}[]           │
│ explanation             : string (in target language)          │
│ language                : string                               │
│ processing_time_ms      : number                               │
│ bedrock_model_used      : string                               │
│ request_id              : uuid                                 │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         IAM Roles                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Lambda: Textract Processor                                     │
│  ├─ s3:GetObject (raw bucket)                                   │
│  ├─ s3:PutObject (processed bucket)                             │
│  ├─ s3:GetObject (prompts bucket)                               │
│  ├─ textract:DetectDocumentText                                 │
│  ├─ bedrock:InvokeModel (Claude Sonnet)                         │
│  └─ dynamodb:PutItem (Schemes table)                            │
│                                                                  │
│  Lambda: API Handler                                            │
│  ├─ s3:GetObject (prompts bucket)                               │
│  ├─ dynamodb:Scan (Schemes table)                               │
│  ├─ bedrock:InvokeModel (Claude Sonnet + Haiku)                │
│  └─ logs:CreateLogGroup, PutLogEvents                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Encryption                                  │
├─────────────────────────────────────────────────────────────────┤
│  S3 Buckets          : SSE-S3 (AES-256)                         │
│  DynamoDB            : Encryption at rest (AWS managed)         │
│  API Gateway         : HTTPS only                               │
│  Lambda Environment  : Encrypted environment variables          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        COST OPTIMIZATION                              │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Strategy                          │  Savings                   │
├────────────────────────────────────┼────────────────────────────┤
│  Prompt caching in Lambda          │  Reduces S3 GET requests   │
│  DynamoDB on-demand billing        │  No idle capacity charges  │
│  S3 lifecycle (IA after 7 days)    │  50% storage cost savings  │
│  Lambda reserved concurrency (20)  │  Prevents runaway costs    │
│  Bedrock max_tokens enforcement    │  Caps token usage          │
│  Haiku for translation             │  5x cheaper than Sonnet    │
│  Textract DetectDocumentText       │  Cheaper than Analyze      │
│  Exponential backoff retries       │  Avoids duplicate calls    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        MONITORING & OBSERVABILITY                     │
└──────────────────────────────────────────────────────────────────────┘

CloudWatch Logs
├─ /aws/lambda/GovSaathi-TextractProcessor
│  └─ PDF processing, Bedrock calls, errors
└─ /aws/lambda/GovSaathi-ApiHandler
   └─ API requests, match logic, response times

CloudWatch Metrics
├─ Lambda Invocations
├─ Lambda Duration
├─ Lambda Errors
├─ API Gateway 4xx/5xx
├─ DynamoDB Read/Write Units
└─ Bedrock Token Usage (custom)

Cost Monitoring
├─ AWS Cost Explorer (daily)
├─ Budget Alerts ($100, $140)
└─ Custom cost tracking script

┌──────────────────────────────────────────────────────────────────────┐
│                        PHASE 2 PREVIEW                                │
└──────────────────────────────────────────────────────────────────────┘

Additions in Phase 2:
┌─────────────────────────────────────────────────────────────────┐
│  + Amazon Titan Embeddings V2 (vector generation)              │
│  + Vector similarity search (cosine distance)                   │
│  + Amazon Comprehend (entity extraction)                        │
│  + AWS Step Functions (batch ingestion orchestration)           │
│  + DynamoDB: Store embeddings as JSON strings                   │
│  + Enhanced matching: Semantic search + Claude re-ranking       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                        │
└──────────────────────────────────────────────────────────────────────┘

Developer Machine
       │
       │ cdk deploy
       ▼
┌──────────────────┐
│  AWS CDK         │
│  TypeScript      │
└────────┬─────────┘
         │
         │ CloudFormation
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    AWS CloudFormation                             │
│  - Creates all resources                                         │
│  - Manages dependencies                                          │
│  - Handles rollback on failure                                   │
│  - Tags: Project=GovSaathi, Phase=1, CostCenter=Hackathon       │
└──────────────────────────────────────────────────────────────────┘
         │
         │ Provisions
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    AWS Resources                                  │
│  S3 Buckets → Lambda Functions → DynamoDB → API Gateway         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        SCALABILITY                                    │
└──────────────────────────────────────────────────────────────────────┘

Current Limits (Phase 1):
├─ Lambda Concurrency: 20 (reserved)
├─ API Gateway: 100 req/sec burst, 10 req/sec steady
├─ DynamoDB: On-demand (auto-scales)
└─ S3: Unlimited storage

Future Scaling (Phase 2+):
├─ Increase Lambda concurrency to 100
├─ Add DynamoDB GSI for faster queries
├─ Implement caching layer (ElastiCache)
├─ Add CloudFront CDN for frontend
└─ Multi-region deployment for HA

┌──────────────────────────────────────────────────────────────────────┐
│                        ERROR HANDLING                                 │
└──────────────────────────────────────────────────────────────────────┘

Retry Strategy:
┌─────────────────────────────────────────────────────────────────┐
│  Bedrock ThrottlingException                                    │
│  ├─ Attempt 1: Immediate                                        │
│  ├─ Attempt 2: Wait 1 second                                    │
│  ├─ Attempt 3: Wait 2 seconds                                   │
│  └─ Attempt 4: Wait 4 seconds → Fail gracefully                │
└─────────────────────────────────────────────────────────────────┘

Graceful Degradation:
├─ If Bedrock fails → Return cached result or error message
├─ If DynamoDB empty → Return helpful message to upload schemes
├─ If Textract fails → Log error, skip scheme
└─ If translation fails → Return English explanation

┌──────────────────────────────────────────────────────────────────────┐
│                        COMPLIANCE & PRIVACY                           │
└──────────────────────────────────────────────────────────────────────┘

Data Handling:
├─ No Aadhaar numbers stored (only name, DOB, state)
├─ User consent required for document uploads
├─ Data retention: 30 days for processed PDFs
├─ Encryption at rest and in transit
└─ Minimal data collection principle

DPDP Act Alignment:
├─ Purpose limitation (scheme matching only)
├─ Data minimization (essential fields only)
├─ Storage limitation (lifecycle policies)
├─ Security safeguards (encryption, IAM)
└─ Transparency (clear data usage)
