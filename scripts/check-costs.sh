#!/bin/bash

set -e

echo "=== GovSaathi Cost Check ==="
echo ""

# Get current month costs
START_DATE=$(date -u +%Y-%m-01)
END_DATE=$(date -u +%Y-%m-%d)

echo "Checking costs from $START_DATE to $END_DATE"
echo ""

# Get cost by service
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --filter file://cost-filter.json \
  --output table

echo ""
echo "Budget Status:"
echo "Total Budget: \$150"
echo "Warning Threshold: \$100"
echo "Critical Threshold: \$140"
echo ""
echo "Check AWS Cost Explorer for detailed breakdown:"
echo "https://console.aws.amazon.com/cost-management/home#/cost-explorer"
