#!/bin/bash

set -e

# Get API URL from CDK output
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase2Stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrlV2'].OutputValue" \
  --output text)

echo "Testing GovSaathi Phase 2 API at: ${API_URL}"
echo ""

# Test 1: User Profile Extraction
echo "Test 1: User Profile Extraction"
curl -X POST "${API_URL}profile" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I am a 35 year old farmer from Maharashtra with 2 hectares of land and annual income of 80000 rupees"
  }' | jq '.'

echo ""
echo ""

# Test 2: Semantic Matching (English)
echo "Test 2: Semantic Matching (English)"
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I am a small farmer in Maharashtra with 1.5 hectares of land",
    "language": "English",
    "user_profile": {
      "occupation": "farmer",
      "state": "Maharashtra",
      "land_ownership": true
    }
  }' | jq '.'

echo ""
echo ""

# Test 3: Semantic Matching (Hindi)
echo "Test 3: Semantic Matching (Hindi)"
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Main Maharashtra mein chota kisan hoon",
    "language": "Hindi",
    "user_profile": {
      "occupation": "farmer",
      "state": "Maharashtra"
    }
  }' | jq '.'

echo ""
echo ""

# Test 4: Cache Hit (repeat previous query)
echo "Test 4: Cache Hit Test"
curl -X POST "${API_URL}match" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Main Maharashtra mein chota kisan hoon",
    "language": "Hindi",
    "user_profile": {
      "occupation": "farmer",
      "state": "Maharashtra"
    }
  }' | jq '.'

echo ""
echo "Phase 2 API tests complete!"
echo "Check X-Cache header: HIT means cached, MISS means fresh computation"
