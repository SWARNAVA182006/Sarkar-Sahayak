#!/bin/bash

set -e

echo "=== GovSaathi Phase 2 Deployment ==="
echo "Budget Allocation: $40"
echo ""

# Install Lambda dependencies
echo "Installing Lambda dependencies..."
cd lambdas/enhanced-scheme-ingestion && npm install && cd ../..
cd lambdas/user-profile && npm install && cd ../..
cd lambdas/scheme-matcher && npm install && cd ../..
cd lambdas/batch-coordinator && npm install && cd ../..

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Deploy CDK stack
echo "Deploying Phase 2 Stack..."
npm run deploy:phase2

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Phase 2 adds:"
echo "- Semantic search with Titan Embeddings"
echo "- Amazon Comprehend entity extraction"
echo "- AWS Step Functions batch processing"
echo "- Match result caching"
echo ""
echo "Next steps:"
echo "1. Re-upload schemes to generate embeddings"
echo "2. Test semantic matching API"
echo "3. Test user profile extraction"
echo ""
echo "Run: bash scripts/test-phase2-api.sh"
