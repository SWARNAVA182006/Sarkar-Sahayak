#!/bin/bash

set -e

# Get API URL from CDK output
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

echo "Testing GovSaathi API at: ${API_URL}match"
echo ""

# Test 1: Farmer query in English
echo "Test 1: Farmer query (English)"
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a small farmer in Maharashtra with 1.5 hectares of land",
    "language": "English"
  }' | jq '.'

echo ""
echo ""

# Test 2: Farmer query in Hindi
echo "Test 2: Farmer query (Hindi)"
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Main Maharashtra mein chota kisan hoon, meri salanaa aamdani 80,000 rupay hai",
    "language": "Hindi"
  }' | jq '.'

echo ""
echo "API tests complete!"
