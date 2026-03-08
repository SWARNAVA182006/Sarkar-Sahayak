#!/bin/bash

set -e

echo "=== Reprocessing Schemes for Phase 2 ==="
echo "This will regenerate embeddings for all existing schemes"
echo ""

# Get raw schemes bucket name
RAW_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='RawSchemesBucketName'].OutputValue" \
  --output text)

echo "Raw schemes bucket: $RAW_BUCKET"
echo ""

# List all PDFs
echo "Listing PDFs in bucket..."
PDFS=$(aws s3 ls s3://$RAW_BUCKET/ | grep '.pdf$' | awk '{print $4}')

if [ -z "$PDFS" ]; then
  echo "No PDFs found in bucket"
  exit 1
fi

echo "Found PDFs:"
echo "$PDFS"
echo ""

# Trigger reprocessing by copying each PDF to itself (triggers S3 event)
echo "Triggering reprocessing..."
for pdf in $PDFS; do
  echo "Reprocessing: $pdf"
  aws s3 cp s3://$RAW_BUCKET/$pdf s3://$RAW_BUCKET/$pdf --metadata-directive REPLACE
  sleep 2  # Avoid throttling
done

echo ""
echo "Reprocessing triggered for all schemes"
echo "Check CloudWatch Logs for progress:"
echo "aws logs tail /aws/lambda/GovSaathi-EnhancedTextractProcessor --follow"
