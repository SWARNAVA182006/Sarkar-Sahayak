#!/bin/bash

set -e

# Get API URL and Cognito details from CDK output
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

echo "=== GovSaathi Phase 3 API Testing ==="
echo "API URL: $API_URL"
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo ""

# Create test user
echo "Creating test user..."
TEST_EMAIL="test@govsaathi.example.com"
TEST_PASSWORD="Test@123456"

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username $TEST_EMAIL \
  --user-attributes Name=email,Value=$TEST_EMAIL Name=email_verified,Value=true \
  --temporary-password $TEST_PASSWORD \
  --message-action SUPPRESS || echo "User may already exist"

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username $TEST_EMAIL \
  --password $TEST_PASSWORD \
  --permanent || echo "Password already set"

echo ""
echo "Test user created: $TEST_EMAIL / $TEST_PASSWORD"
echo ""

# Authenticate and get token
echo "Authenticating..."
AUTH_RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=$TEST_EMAIL,PASSWORD=$TEST_PASSWORD \
  --query 'AuthenticationResult.IdToken' \
  --output text)

if [ -z "$AUTH_RESPONSE" ]; then
  echo "Authentication failed"
  exit 1
fi

echo "Authentication successful!"
echo ""

# Test 1: Voice Generation
echo "Test 1: Voice Generation (Hindi)"
curl -X POST "${API_URL}voice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_RESPONSE" \
  -d '{
    "text": "यह योजना छोटे किसानों के लिए है। आप इस योजना के लिए पात्र हैं।",
    "language": "Hindi"
  }' | jq '.'

echo ""
echo ""

# Test 2: Scheme Explanation with Voice
echo "Test 2: Scheme Explanation with Voice"
curl -X POST "${API_URL}explain" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_RESPONSE" \
  -d '{
    "scheme_id": "PM-KISAN",
    "language": "Hindi",
    "include_voice": true
  }' | jq '.'

echo ""
echo ""

# Test 3: Upload URL Generation
echo "Test 3: Generate Upload URL"
curl -X POST "${API_URL}upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_RESPONSE" \
  -d '{
    "file_name": "aadhaar.jpg",
    "content_type": "image/jpeg",
    "user_id": "test-user-123"
  }' | jq '.'

echo ""
echo ""
echo "Phase 3 API tests complete!"
echo ""
echo "Note: To test document OCR:"
echo "1. Use the upload URL from Test 3"
echo "2. Upload an image of Aadhaar/ration card"
echo "3. Check CloudWatch Logs for OCR results"
echo "4. Query DynamoDB Users table for extracted data"
