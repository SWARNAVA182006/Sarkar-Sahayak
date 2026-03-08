#!/bin/bash

set -e

echo "=== Subscribe to GovSaathi Cost Alerts ==="
echo ""

# Get SNS topic ARN
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name Phase3Stack \
  --query "Stacks[0].Outputs[?OutputKey=='AlertTopicArn'].OutputValue" \
  --output text)

echo "SNS Topic ARN: $TOPIC_ARN"
echo ""

# Prompt for email
read -p "Enter your email address for alerts: " EMAIL

if [ -z "$EMAIL" ]; then
  echo "Email address is required"
  exit 1
fi

# Subscribe to topic
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint $EMAIL

echo ""
echo "Subscription request sent!"
echo "Check your email ($EMAIL) and confirm the subscription."
echo ""
echo "You will receive alerts when:"
echo "- Bedrock invocations exceed 500/day"
echo "- Other cost thresholds are breached"
