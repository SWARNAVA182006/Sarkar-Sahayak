# GovSaathi AI 🇮🇳

AI-Powered Government Scheme Discovery & Assistance Platform

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange)](https://aws.amazon.com)
[![Bedrock](https://img.shields.io/badge/Amazon-Bedrock-blue)](https://aws.amazon.com/bedrock)
[![CDK](https://img.shields.io/badge/AWS-CDK-green)](https://aws.amazon.com/cdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> Bridging the gap between Indian citizens and 1,000+ government welfare schemes through GenAI

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

## 🎯 Project Overview

GovSaathi helps rural and semi-urban Indian citizens discover government welfare schemes they're eligible for through conversational AI in multiple Indian languages.

### The Problem
- India has 1,000+ welfare schemes, but awareness is critically low
- Scheme documents are dense PDFs in bureaucratic language
- Existing portals require complex navigation
- Rural citizens lack access to scheme information

### Our Solution
An intelligent AI assistant that:
- Understands natural language queries in Hindi, English, and regional languages
- Matches users to relevant schemes based on their situation
- Explains eligibility in simple, accessible language
- Guides users through the application process step-by-step

## 🚀 Quick Start

Get Phase 1 running in 30 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Bootstrap CDK (first time only)
cdk bootstrap

# 4. Deploy Phase 1
npm run deploy:phase1

# 5. Upload prompts and sample scheme
bash scripts/upload-prompts.sh
bash scripts/upload-sample-scheme.sh

# 6. Test the API
bash scripts/test-api.sh
```

**See [QUICKSTART.md](QUICKSTART.md) for detailed instructions**

## 💰 Budget Constraint

**Total AWS Credits: $150**

Every service selection and implementation choice is justified against this hard cap.

**Phase 1 Estimated Cost:** ~$0.78 (97% under $25 budget)

## Architecture

- **GenAI**: Amazon Bedrock (Claude 3 Sonnet & Haiku)
- **Storage**: Amazon S3, DynamoDB
- **Compute**: AWS Lambda
- **API**: Amazon API Gateway
- **AI Services**: Amazon Textract, Comprehend, Polly
- **IaC**: AWS CDK (TypeScript)

**See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams**

## ✨ Features (Phase 1)

### Automated Scheme Ingestion
- Upload PDF → automatic processing with Textract
- Claude Sonnet parses into structured JSON
- Stores in DynamoDB with metadata
- S3 event-driven pipeline

### Intelligent Matching
- Natural language query understanding
- Mock matching (semantic search in Phase 2)
- Confidence scoring
- Ranked results

### Multilingual Explanations
- Plain-language scheme explanations
- Translation to Hindi and regional languages
- Maintains proper nouns in original form
- Context-aware responses

### Cost-Optimized Design
- Prompt caching in Lambda
- Exponential backoff for Bedrock
- DynamoDB on-demand billing
- S3 lifecycle policies
- Reserved Lambda concurrency

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 30-minute setup guide |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Detailed deployment steps |
| [PHASE1_CHECKLIST.md](PHASE1_CHECKLIST.md) | Validation checklist |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture diagrams |
| [COST_TRACKING.md](COST_TRACKING.md) | Budget breakdown |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Comprehensive overview |
| [STATUS.md](STATUS.md) | Current project status |
| [INDEX.md](INDEX.md) | Complete file reference |

## Phase Roadmap

- ✅ **Phase 1** (Days 0-1, $25): MVP with basic matching
- ⏳ **Phase 2** (Days 2-5, $40): Semantic search with embeddings
- ⏳ **Phase 3** (Days 6-10, $30): Voice interface + document OCR
- ⏳ **Phase 4** (Days 11-14, $25): Mobile frontend

## 🎯 Phase 1 - 24-Hour MVP (Budget: $25)

### Goal
Prove end-to-end integration with a functional pipeline that:
1. Ingests scheme PDFs
2. Parses with Claude via Bedrock
3. Stores in DynamoDB
4. Answers user queries via API

### Deliverables
- ✅ Working REST API returning scheme matches
- ✅ Hindi explanation generation
- ✅ Automated PDF processing pipeline
- ✅ Cost under $1 for testing

### Setup

```bash
# Install dependencies
npm install

# Deploy Phase 1
bash scripts/deploy-phase1.sh

# Upload prompts to S3
bash scripts/upload-prompts.sh

# Upload sample scheme
bash scripts/upload-sample-scheme.sh

# Test API
bash scripts/test-api.sh
```

### API Endpoints

**POST /match**

Request:
```json
{
  "query": "I am a small farmer in Maharashtra",
  "language": "Hindi"
}
```

Response:
```json
{
  "matched_schemes": [
    {
      "scheme_id": "PM-KISAN",
      "scheme_name": "Pradhan Mantri Kisan Samman Nidhi",
      "ministry": "Ministry of Agriculture",
      "confidence_score": 0.85
    }
  ],
  "explanation": "यह योजना छोटे किसानों के लिए है...",
  "language": "Hindi",
  "processing_time_ms": 2500,
  "bedrock_model_used": "claude-3-sonnet + claude-3-haiku",
  "request_id": "uuid"
}
```

## Project Structure

```
govsaathi/
├── infrastructure/          # CDK stacks
│   ├── lib/
│   │   ├── phase1-stack.ts
│   │   ├── phase2-stack.ts
│   │   ├── phase3-stack.ts
│   │   └── phase4-stack.ts
│   └── app.ts
├── lambdas/
│   ├── scheme-ingestion/    # Textract + Claude parser
│   ├── api-handler/         # API Gateway router
│   ├── user-profile/        # Comprehend entity extraction
│   ├── scheme-matcher/      # Embedding similarity + Claude
│   ├── voice-generator/     # Polly TTS
│   └── document-ocr/        # User doc OCR
├── prompts/                 # Bedrock prompt templates
├── data/sample-schemes/     # Seed PDFs
├── scripts/                 # Deployment scripts
└── tests/                   # Integration tests
```

## Cost Controls

1. **Bedrock**: max_tokens capped (1500 Sonnet, 800 Haiku)
2. **Textract**: DetectDocumentText for plain PDFs only
3. **DynamoDB**: On-demand billing mode
4. **S3**: Lifecycle policies (IA after 7 days)
5. **Lambda**: Reserved concurrency = 20
6. **CloudWatch**: Budget alerts at $100 and $140

## Phase Roadmap

- ✅ **Phase 1** (Days 0-1): MVP with basic matching
- ⏳ **Phase 2** (Days 2-5): Semantic search with embeddings
- ⏳ **Phase 3** (Days 6-10): Voice interface + document OCR
- ⏳ **Phase 4** (Days 11-14): Mobile frontend

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Deploy specific phase
npm run deploy:phase1
npm run deploy:phase2
npm run deploy:phase3
npm run deploy:phase4

# Deploy all
npm run deploy:all
```

## Security

- All S3 buckets: SSE-S3 encryption
- DynamoDB: Encryption at rest
- API Gateway: CORS enabled
- Cognito: JWT authentication (Phase 3+)
- No PII stored (Aadhaar numbers excluded)

## Compliance

Designed with India's DPDP Act intent in mind:
- Minimal data collection
- No storage of sensitive ID numbers
- User consent for document uploads
- Data retention policies

## Support

For issues or questions, check CloudWatch Logs for Lambda execution details.
