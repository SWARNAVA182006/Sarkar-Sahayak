#!/bin/bash

set -e

echo "=== GovSaathi Cleanup ==="
echo "This will destroy all AWS resources to avoid ongoing charges"
echo ""

read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled"
  exit 0
fi

echo ""
echo "Destroying CDK stacks..."

# Destroy all stacks
cdk destroy --all --force

echo ""
echo "Checking for orphaned resources..."

# List resources with GovSaathi tag
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=GovSaathi \
  --output table

echo ""
echo "Cleanup complete!"
echo "Verify in AWS Console that all resources are deleted."
