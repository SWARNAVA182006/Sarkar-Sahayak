#!/bin/bash

set -e

# Get frontend URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name Phase4Stack \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text)

echo "=== GovSaathi Frontend Testing ==="
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Manual Testing Checklist:"
echo ""
echo "1. Home Page"
echo "   - [ ] Page loads correctly"
echo "   - [ ] Language selector works"
echo "   - [ ] Text input accepts queries"
echo "   - [ ] Voice input button visible"
echo "   - [ ] Feature cards displayed"
echo ""
echo "2. Authentication"
echo "   - [ ] Sign up flow works"
echo "   - [ ] Email verification works"
echo "   - [ ] Sign in works"
echo "   - [ ] JWT token received"
echo ""
echo "3. Search Flow"
echo "   - [ ] Enter query and search"
echo "   - [ ] Results page loads"
echo "   - [ ] Schemes displayed with match scores"
echo "   - [ ] Click on scheme card"
echo ""
echo "4. Scheme Detail"
echo "   - [ ] Scheme details displayed"
echo "   - [ ] Explanation shown"
echo "   - [ ] Voice button works"
echo "   - [ ] Audio plays correctly"
echo "   - [ ] Benefits, eligibility, steps shown"
echo ""
echo "5. Profile Page"
echo "   - [ ] User info displayed"
echo "   - [ ] Document upload works"
echo "   - [ ] File preview shown"
echo "   - [ ] Upload completes"
echo ""
echo "6. Mobile Responsiveness"
echo "   - [ ] Works on mobile screen sizes"
echo "   - [ ] Touch interactions work"
echo "   - [ ] Layout adapts correctly"
echo ""
echo "Open $FRONTEND_URL in your browser to start testing!"
