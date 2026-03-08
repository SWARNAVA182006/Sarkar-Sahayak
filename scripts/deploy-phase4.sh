#!/bin/bash

set -e

echo "=== GovSaathi Phase 4 Deployment ==="
echo "Budget Allocation: $25"
echo ""

# Get Phase 3 outputs for frontend config
echo "Fetching Phase 3 configuration..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase3Stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrlV3'].OutputValue" \
  --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name Phase3Stack \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name Phase3Stack \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text)

# Create .env file for frontend
echo "Creating frontend configuration..."
cat > frontend/.env << EOF
VITE_API_URL=$API_URL
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID
VITE_AWS_REGION=us-east-1
EOF

echo "Frontend configuration created!"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build frontend
echo "Building frontend..."
cd frontend && npm run build && cd ..

# Build TypeScript for CDK
echo "Building CDK TypeScript..."
npm run build

# Deploy Phase 4 Stack
echo "Deploying Phase 4 Stack..."
npm run deploy:phase4

# Get CloudFront distribution
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name Phase4Stack \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase4Stack \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text)

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name Phase4Stack \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

# Upload frontend to S3
echo ""
echo "Uploading frontend to S3..."
aws s3 sync frontend/dist s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Phase 4 adds:"
echo "- Mobile-optimized React web app"
echo "- CloudFront CDN for fast delivery"
echo "- Complete user journey"
echo "- Offline-capable design"
echo ""
echo "Open the URL in your browser to test!"
