#!/bin/bash

set -e

echo "=== GovSaathi Phase 3 Deployment ==="
echo "Budget Allocation: $30"
echo ""

# Install Lambda dependencies
echo "Installing Lambda dependencies..."
cd lambdas/voice-generator && npm install && cd ../..
cd lambdas/document-ocr && npm install && cd ../..
cd lambdas/enhanced-api-handler && npm install && cd ../..

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Deploy CDK stack
echo "Deploying Phase 3 Stack..."
npm run deploy:phase3

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Phase 3 adds:"
echo "- Amazon Polly voice output (Hindi)"
echo "- Document OCR (Aadhaar, ration cards)"
echo "- Amazon Cognito authentication"
echo "- CloudWatch cost alerts"
echo ""
echo "Next steps:"
echo "1. Create a Cognito user for testing"
echo "2. Test voice generation API"
echo "3. Test document upload and OCR"
echo "4. Subscribe to SNS alerts"
echo ""
echo "Run: bash scripts/test-phase3-api.sh"
