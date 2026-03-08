#!/bin/bash

set -e

# Get prompts bucket name from CDK output
PROMPTS_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name Phase1Stack \
  --query "Stacks[0].Outputs[?OutputKey=='PromptsBucketName'].OutputValue" \
  --output text)

echo "Uploading prompts to bucket: $PROMPTS_BUCKET"

aws s3 cp prompts/scheme-parser.txt s3://$PROMPTS_BUCKET/scheme-parser.txt
aws s3 cp prompts/explanation-generator.txt s3://$PROMPTS_BUCKET/explanation-generator.txt
aws s3 cp prompts/translation.txt s3://$PROMPTS_BUCKET/translation.txt
aws s3 cp prompts/eligibility-ranker.txt s3://$PROMPTS_BUCKET/eligibility-ranker.txt
aws s3 cp prompts/form-assistant.txt s3://$PROMPTS_BUCKET/form-assistant.txt

echo "Prompts uploaded successfully!"
