#!/bin/bash

set -e

echo "=== GovSaathi Phase 1 Deployment ==="
echo "Budget Allocation: $25"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Install Lambda dependencies
echo "Installing Lambda dependencies..."
cd lambdas/scheme-ingestion && npm install && cd ../..
cd lambdas/api-handler && npm install && cd ../..

# Deploy CDK stack
echo "Deploying Phase 1 Stack..."
npm run deploy:phase1

# Get stack outputs
echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Upload prompts to S3 prompts bucket"
echo "2. Upload sample scheme PDF to raw schemes bucket"
echo "3. Test the /match API endpoint"
echo ""
echo "Run: bash scripts/upload-prompts.sh"
echo "Run: bash scripts/upload-sample-scheme.sh"
