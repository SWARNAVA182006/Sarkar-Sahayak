#!/bin/bash

set -e

# Get raw schemes bucket name from CDK output
RAW_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='RawSchemesBucketName'].OutputValue" \
  --output text)

echo "Converting sample scheme text to PDF format..."
echo "Note: For Phase 1 MVP, we'll upload the text file directly"
echo "In production, use actual PDF files from government portals"

# Create a simple text file that simulates PDF content
cp data/sample-schemes/PM-KISAN-sample.txt data/sample-schemes/PM-KISAN.pdf

echo "Uploading PM-KISAN scheme to bucket: $RAW_BUCKET"
aws s3 cp data/sample-schemes/PM-KISAN.pdf s3://$RAW_BUCKET/PM-KISAN.pdf

echo "Sample scheme uploaded! Lambda will process it automatically."
echo "Check CloudWatch Logs for processing status."
