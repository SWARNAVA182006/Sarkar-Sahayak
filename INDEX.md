# GovSaathi - Project Index

Complete reference guide to all project files and their purposes.

---

## 📚 Documentation Files

### Getting Started
| File | Purpose | When to Read |
|------|---------|--------------|
| **README.md** | Project overview, architecture, features | Start here first |
| **QUICKSTART.md** | 30-minute setup guide | When ready to deploy |
| **STATUS.md** | Current project status and readiness | Check before deployment |

### Deployment
| File | Purpose | When to Read |
|------|---------|--------------|
| **DEPLOYMENT_GUIDE.md** | Detailed step-by-step deployment | During deployment |
| **PHASE1_CHECKLIST.md** | Validation checklist for Phase 1 | After deployment |

### Technical
| File | Purpose | When to Read |
|------|---------|--------------|
| **ARCHITECTURE.md** | System architecture diagrams | Understanding design |
| **COST_TRACKING.md** | Budget breakdown and monitoring | Cost planning |
| **PROJECT_SUMMARY.md** | Comprehensive project overview | For stakeholders |

---

## 🏗️ Infrastructure Code

### CDK Stacks
| File | Purpose | Lines | Key Resources |
|------|---------|-------|---------------|
| **infrastructure/app.ts** | CDK app entry point | 20 | Stack initialization |
| **infrastructure/lib/phase1-stack.ts** | Phase 1 infrastructure | 150 | S3, DynamoDB, Lambda, API Gateway |

### Configuration
| File | Purpose |
|------|---------|
| **cdk.json** | CDK configuration and context |
| **tsconfig.json** | TypeScript compiler settings |
| **jest.config.js** | Jest test configuration |
| **package.json** | Node.js dependencies and scripts |

---

## ⚡ Lambda Functions

### Scheme Ingestion
| File | Purpose | Lines | Key Features |
|------|---------|-------|--------------|
| **lambdas/scheme-ingestion/index.ts** | PDF processing pipeline | 120 | Textract, Bedrock, DynamoDB |
| **lambdas/scheme-ingestion/package.json** | Dependencies | 15 | AWS SDK v3 |

**Trigger:** S3 upload event  
**Runtime:** Node.js 20.x  
**Memory:** 1024 MB  
**Timeout:** 5 minutes

### API Handler
| File | Purpose | Lines | Key Features |
|------|---------|-------|--------------|
| **lambdas/api-handler/index.ts** | REST API endpoint handler | 150 | Matching, explanation, translation |
| **lambdas/api-handler/package.json** | Dependencies | 15 | AWS SDK v3 |

**Trigger:** API Gateway POST /match  
**Runtime:** Node.js 20.x  
**Memory:** 512 MB  
**Timeout:** 30 seconds

---

## 🤖 AI Prompts

### Bedrock Prompt Templates
| File | Purpose | Model | Max Tokens |
|------|---------|-------|------------|
| **prompts/scheme-parser.txt** | Extract structured JSON from PDFs | Claude Sonnet | 1500 |
| **prompts/explanation-generator.txt** | Generate plain-language explanations | Claude Sonnet | 1500 |
| **prompts/translation.txt** | Translate to Indian languages | Claude Haiku | 800 |
| **prompts/eligibility-ranker.txt** | Score user-scheme match | Claude Sonnet | 1500 |
| **prompts/form-assistant.txt** | Generate form-filling instructions | Claude Haiku | 800 |

**Storage:** S3 bucket (govsaathi-prompts-*)  
**Caching:** Loaded once at Lambda cold start  
**Format:** Plain text with {{VARIABLE}} placeholders

---

## 📊 Sample Data

### Scheme PDFs
| File | Purpose | Size | Status |
|------|---------|------|--------|
| **data/sample-schemes/PM-KISAN-sample.txt** | Sample scheme for testing | 2 KB | ✅ Ready |

**Note:** In production, use actual PDF files from government portals.

---

## 🧪 Tests

### Unit Tests
| File | Purpose | Test Cases |
|------|---------|------------|
| **tests/cosine-similarity.test.ts** | Vector similarity calculation | 5 |
| **tests/scheme-parser.test.ts** | JSON parsing validation | 2 |

**Framework:** Jest  
**Coverage:** Core utilities  
**Run:** `npm test`

---

## 🔧 Scripts

### Deployment Scripts
| File | Purpose | Usage |
|------|---------|-------|
| **scripts/deploy-phase1.sh** | Deploy Phase 1 infrastructure | `bash scripts/deploy-phase1.sh` |
| **scripts/upload-prompts.sh** | Upload Bedrock prompts to S3 | `bash scripts/upload-prompts.sh` |
| **scripts/upload-sample-scheme.sh** | Upload sample PDF | `bash scripts/upload-sample-scheme.sh` |

### Testing Scripts
| File | Purpose | Usage |
|------|---------|-------|
| **scripts/test-api.sh** | Test API endpoints | `bash scripts/test-api.sh` |

### Monitoring Scripts
| File | Purpose | Usage |
|------|---------|-------|
| **scripts/check-costs.sh** | Check AWS spending | `bash scripts/check-costs.sh` |

### Cleanup Scripts
| File | Purpose | Usage |
|------|---------|-------|
| **scripts/cleanup.sh** | Destroy all resources | `bash scripts/cleanup.sh` |

---

## 📋 Configuration Files

### AWS
| File | Purpose |
|------|---------|
| **cost-filter.json** | Cost Explorer filter for GovSaathi resources |

### Git
| File | Purpose |
|------|---------|
| **.gitignore** | Exclude node_modules, build artifacts, secrets |

### IDE
| File | Purpose |
|------|---------|
| **.vscode/settings.json** | VS Code workspace settings |

---

## 📦 Dependencies

### Root Package
```json
{
  "aws-cdk-lib": "^2.133.0",
  "constructs": "^10.3.0",
  "@aws-sdk/client-*": "^3.540.0"
}
```

### Lambda Packages
```json
{
  "@aws-sdk/client-bedrock-runtime": "^3.540.0",
  "@aws-sdk/client-textract": "^3.540.0",
  "@aws-sdk/client-s3": "^3.540.0",
  "@aws-sdk/client-dynamodb": "^3.540.0"
}
```

---

## 🗂️ Project Structure

```
govsaathi/
├── 📄 Documentation (8 files)
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── PHASE1_CHECKLIST.md
│   ├── COST_TRACKING.md
│   ├── ARCHITECTURE.md
│   ├── PROJECT_SUMMARY.md
│   └── STATUS.md
│
├── 🏗️ Infrastructure (2 files)
│   ├── infrastructure/app.ts
│   └── infrastructure/lib/phase1-stack.ts
│
├── ⚡ Lambda Functions (4 files)
│   ├── lambdas/scheme-ingestion/
│   │   ├── index.ts
│   │   └── package.json
│   └── lambdas/api-handler/
│       ├── index.ts
│       └── package.json
│
├── 🤖 AI Prompts (5 files)
│   ├── prompts/scheme-parser.txt
│   ├── prompts/explanation-generator.txt
│   ├── prompts/translation.txt
│   ├── prompts/eligibility-ranker.txt
│   └── prompts/form-assistant.txt
│
├── 📊 Sample Data (1 file)
│   └── data/sample-schemes/PM-KISAN-sample.txt
│
├── 🧪 Tests (2 files)
│   ├── tests/cosine-similarity.test.ts
│   └── tests/scheme-parser.test.ts
│
├── 🔧 Scripts (6 files)
│   ├── scripts/deploy-phase1.sh
│   ├── scripts/upload-prompts.sh
│   ├── scripts/upload-sample-scheme.sh
│   ├── scripts/test-api.sh
│   ├── scripts/check-costs.sh
│   └── scripts/cleanup.sh
│
└── ⚙️ Configuration (5 files)
    ├── package.json
    ├── tsconfig.json
    ├── cdk.json
    ├── jest.config.js
    └── .gitignore
```

**Total Files:** 33  
**Total Lines of Code:** ~1,500  
**Languages:** TypeScript, Bash, Markdown

---

## 🎯 Quick Reference

### Most Important Files

1. **README.md** - Start here
2. **QUICKSTART.md** - Deploy in 30 minutes
3. **infrastructure/lib/phase1-stack.ts** - All AWS resources
4. **lambdas/scheme-ingestion/index.ts** - PDF processing
5. **lambdas/api-handler/index.ts** - API logic

### Most Used Commands

```bash
# Deploy
npm run deploy:phase1

# Test
bash scripts/test-api.sh

# Monitor
bash scripts/check-costs.sh

# Cleanup
bash scripts/cleanup.sh
```

### Most Important AWS Resources

1. **S3 Buckets:** govsaathi-schemes-raw-*, govsaathi-processed-*, govsaathi-prompts-*
2. **DynamoDB Table:** GovSaathi-Schemes
3. **Lambda Functions:** GovSaathi-TextractProcessor, GovSaathi-ApiHandler
4. **API Gateway:** /prod/match endpoint

---

## 📊 File Statistics

### By Type
| Type | Count | Total Lines |
|------|-------|-------------|
| Documentation | 9 | ~3,000 |
| TypeScript | 4 | ~500 |
| Prompts | 5 | ~100 |
| Scripts | 6 | ~200 |
| Tests | 2 | ~100 |
| Config | 5 | ~200 |
| **Total** | **31** | **~4,100** |

### By Phase
| Phase | Files | Status |
|-------|-------|--------|
| Phase 1 | 31 | ✅ Complete |
| Phase 2 | 0 | ⏳ Planned |
| Phase 3 | 0 | ⏳ Planned |
| Phase 4 | 0 | ⏳ Planned |

---

## 🔍 Finding What You Need

### "I want to..."

**Deploy the project**
→ Read QUICKSTART.md, run `bash scripts/deploy-phase1.sh`

**Understand the architecture**
→ Read ARCHITECTURE.md and README.md

**Check costs**
→ Read COST_TRACKING.md, run `bash scripts/check-costs.sh`

**Modify Lambda functions**
→ Edit `lambdas/*/index.ts`, run `npm run build`, redeploy

**Add new prompts**
→ Create file in `prompts/`, upload with `bash scripts/upload-prompts.sh`

**Test the API**
→ Run `bash scripts/test-api.sh` or use Postman

**Debug issues**
→ Check CloudWatch Logs, read DEPLOYMENT_GUIDE.md troubleshooting

**Clean up resources**
→ Run `bash scripts/cleanup.sh`

---

## 🚀 Next Steps

### Phase 1 (Current)
1. Deploy infrastructure
2. Test API endpoint
3. Validate costs
4. Complete checklist

### Phase 2 (Next)
1. Add semantic search
2. Implement Comprehend
3. Expand to 50 schemes
4. Improve matching accuracy

### Phase 3 (Future)
1. Add voice interface
2. Implement document OCR
3. Add authentication
4. Support more languages

### Phase 4 (Final)
1. Build mobile frontend
2. Add offline support
3. Complete demo flow
4. Prepare for launch

---

## 📞 Support

### Documentation
- Start with README.md
- Check QUICKSTART.md for fast setup
- Read DEPLOYMENT_GUIDE.md for details
- Review PHASE1_CHECKLIST.md for validation

### Troubleshooting
- Check CloudWatch Logs
- Review error messages
- Consult AWS documentation
- Check AWS Service Health Dashboard

### Monitoring
- AWS Cost Explorer
- CloudWatch Logs
- DynamoDB Console
- API Gateway Console

---

**Last Updated:** March 8, 2026  
**Project Version:** 1.0.0 (Phase 1)  
**Status:** ✅ Ready for Deployment
