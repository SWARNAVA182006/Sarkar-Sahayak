# Phase 4 - Mobile Frontend

**Budget: $25 | Duration: Days 11-14**

## Overview

Phase 4 completes the project with a mobile-optimized React web application that brings all backend features together in a user-friendly interface.

## Features

### 1. Mobile-Optimized Design
- Responsive layout for all screen sizes
- Touch-friendly interactions
- Fast loading with code splitting
- Progressive Web App capabilities

### 2. User Journey
1. **Home Page**: Language selection and query input
2. **Results Page**: Matched schemes with scores
3. **Scheme Detail**: Full information with voice output
4. **Profile Page**: Document upload and user management

### 3. Voice Integration
- Web Speech API for voice input
- Audio playback for Hindi explanations
- Visual feedback during recording
- Fallback to text input

### 4. Authentication Flow
- AWS Amplify UI components
- Email/phone sign-up
- OTP verification
- Persistent sessions

### 5. Document Upload
- Pre-signed S3 URLs
- Image preview
- Upload progress
- OCR result display

## Architecture

### Frontend Stack
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool (fast HMR)
- **React Router**: Client-side routing
- **AWS Amplify**: Auth & API integration
- **Axios**: HTTP client

### Hosting
- **S3**: Static file hosting
- **CloudFront**: CDN for global delivery
- **Price Class 100**: North America + Europe only (cost optimization)

### Build Output
- Minified JavaScript bundles
- Optimized CSS
- Compressed assets
- Source maps (optional)

## Deployment

### Prerequisites
- Phases 1, 2, and 3 deployed
- Node.js 20.x installed
- AWS CLI configured

### Step 1: Deploy Phase 4 Stack

```bash
bash scripts/deploy-phase4.sh
```

This will:
1. Fetch Phase 3 configuration (API URL, Cognito details)
2. Create frontend `.env` file
3. Install frontend dependencies
4. Build React app
5. Deploy CDK stack (S3 + CloudFront)
6. Upload build to S3
7. Invalidate CloudFront cache

**Estimated Time:** 15 minutes

### Step 2: Test Frontend

```bash
bash scripts/test-frontend.sh
```

This displays the frontend URL and testing checklist.

### Step 3: Manual Testing

Open the CloudFront URL in your browser and test:
- Home page loads
- Language selection works
- Search returns results
- Scheme details display
- Voice output plays
- Document upload works

## Pages

### Home Page (`/`)

**Features:**
- Language selector (6 languages)
- Text input for queries
- Voice input button
- Feature cards
- Sign in/Sign up

**User Flow:**
1. Select language (Hindi, English, etc.)
2. Enter query or use voice input
3. Click "Find Schemes"
4. Navigate to Results page

### Results Page (`/results`)

**Features:**
- Grid of matched schemes
- Match score badges (color-coded)
- Scheme summaries
- Click to view details

**Data:**
- Fetched from Phase 2 semantic matching API
- Cached results for performance
- Loading states
- Error handling

### Scheme Detail Page (`/scheme/:id`)

**Features:**
- Full scheme information
- Explanation in selected language
- Voice output button
- Benefits list
- Eligibility criteria
- Application steps
- Required documents
- Official website link

**Interactions:**
- Play audio explanation
- Back to results
- Share scheme (future)

### Profile Page (`/profile`)

**Features:**
- User information display
- Document upload
- File preview
- Upload progress
- Extracted data display
- Sign out button

**Document Upload Flow:**
1. Select image file (JPG/PNG)
2. Preview selected file
3. Click "Upload & Process"
4. Wait for OCR processing
5. View extracted data

## Environment Configuration

### `.env` File

Created automatically by deployment script:

```
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_AWS_REGION=us-east-1
```

### Manual Configuration

If needed, create `.env` manually in `frontend/` directory with values from Phase 3 stack outputs.

## Development

### Local Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
cd frontend

# Build
npm run build

# Preview build
npm run preview
```

### Linting

```bash
cd frontend
npm run lint
```

## Cost Breakdown

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| S3 | 10 MB static files | $0.23 |
| CloudFront | 1 GB data transfer | $0.085 |
| CloudFront | 10,000 requests | $0.01 |
| Lambda@Edge | Not used | $0 |
| Route 53 | Not used | $0 |
| **Total** | | **$0.33** |

**Actual Phase 4 cost is much lower than $25 budget!**

Remaining budget can be used for:
- Custom domain ($12/year)
- Additional data transfer
- More CloudFront regions
- WAF protection

## Performance Optimization

### Build Optimizations
- Code splitting by route
- Tree shaking unused code
- Minification
- Gzip compression
- Asset optimization

### Runtime Optimizations
- React.memo for expensive components
- Lazy loading for routes
- Image lazy loading
- Service worker caching (future)

### CloudFront Optimizations
- Edge caching
- Gzip/Brotli compression
- HTTP/2 support
- Price Class 100 (cost optimization)

## Browser Support

### Desktop
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

### Features
- ES2020 JavaScript
- CSS Grid & Flexbox
- Web Speech API (optional)
- Fetch API
- LocalStorage

## Accessibility

### WCAG 2.1 Level AA
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation
- Focus indicators
- Color contrast ratios
- Alt text for images

### Voice Features
- Voice input for accessibility
- Voice output for screen readers
- Text alternatives always available

## Security

### Content Security Policy
- Restrict script sources
- Prevent XSS attacks
- HTTPS only

### Authentication
- Cognito JWT tokens
- Secure token storage
- Auto token refresh
- Session management

### API Security
- CORS configured
- Rate limiting
- Request validation
- Error handling

## Testing

### Manual Testing Checklist

**Home Page:**
- [ ] Page loads without errors
- [ ] Language buttons work
- [ ] Text input accepts queries
- [ ] Voice button triggers recording
- [ ] Search button navigates to results

**Authentication:**
- [ ] Sign up flow completes
- [ ] Email verification works
- [ ] Sign in successful
- [ ] Token stored correctly
- [ ] Protected routes work

**Results Page:**
- [ ] Schemes display correctly
- [ ] Match scores shown
- [ ] Cards are clickable
- [ ] Loading state shows
- [ ] Error handling works

**Scheme Detail:**
- [ ] All information displays
- [ ] Voice button works
- [ ] Audio plays correctly
- [ ] Back button works
- [ ] External links work

**Profile Page:**
- [ ] User info displays
- [ ] File selection works
- [ ] Upload completes
- [ ] Progress shown
- [ ] Sign out works

**Mobile:**
- [ ] Responsive on phone
- [ ] Touch interactions work
- [ ] No horizontal scroll
- [ ] Readable text size
- [ ] Buttons are tappable

### Automated Testing (Future)

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## Troubleshooting

### Issue: Page Not Loading

**Check:**
1. CloudFront distribution deployed
2. S3 bucket has files
3. CloudFront cache invalidated
4. Browser cache cleared

**Solution:**
```bash
# Check S3 files
aws s3 ls s3://govsaathi-frontend-ACCOUNT_ID/

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

### Issue: API Calls Failing

**Check:**
1. `.env` file has correct values
2. API URL is correct
3. Cognito credentials valid
4. CORS configured on API

**Solution:**
- Check browser console for errors
- Verify API URL in `.env`
- Test API directly with curl
- Check CloudWatch Logs

### Issue: Authentication Not Working

**Check:**
1. User Pool ID correct
2. Client ID correct
3. User confirmed email
4. Password meets policy

**Solution:**
```bash
# Confirm user manually
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id POOL_ID \
  --username user@example.com
```

### Issue: Voice Input Not Working

**Check:**
1. Browser supports Web Speech API
2. Microphone permissions granted
3. HTTPS connection (required)
4. Language code correct

**Solution:**
- Use Chrome/Edge (best support)
- Grant microphone permission
- Ensure HTTPS (CloudFront provides this)
- Fall back to text input

### Issue: Document Upload Failing

**Check:**
1. File size < 5 MB
2. File type is JPG or PNG
3. Pre-signed URL not expired
4. S3 bucket permissions correct

**Solution:**
- Compress large images
- Convert to JPG/PNG
- Generate new upload URL
- Check CloudWatch Logs

## Best Practices

### 1. Performance
- Lazy load routes
- Optimize images
- Minimize bundle size
- Use CDN caching

### 2. User Experience
- Show loading states
- Handle errors gracefully
- Provide feedback
- Support offline (future)

### 3. Security
- Validate all inputs
- Sanitize user data
- Use HTTPS only
- Implement CSP

### 4. Accessibility
- Use semantic HTML
- Provide alt text
- Support keyboard navigation
- Test with screen readers

## Future Enhancements

### Phase 4.1 (Optional)
- Service Worker for offline support
- Push notifications
- Install as PWA
- Background sync

### Phase 4.2 (Optional)
- Custom domain
- SSL certificate
- Route 53 DNS
- Email templates

### Phase 4.3 (Optional)
- Analytics integration
- Error tracking (Sentry)
- Performance monitoring
- A/B testing

## Deployment Checklist

- [ ] Phase 3 deployed and tested
- [ ] Frontend dependencies installed
- [ ] Environment variables configured
- [ ] Build completes without errors
- [ ] S3 bucket created
- [ ] CloudFront distribution created
- [ ] Files uploaded to S3
- [ ] Cache invalidated
- [ ] Frontend URL accessible
- [ ] All pages load correctly
- [ ] Authentication works
- [ ] API calls successful
- [ ] Voice features work
- [ ] Document upload works
- [ ] Mobile responsive
- [ ] Cost tracking updated

---

**Phase 4 Status:** Ready for deployment  
**Estimated Cost:** $0.33 (99% under budget!)  
**Key Features:** Mobile UI, Voice integration, Complete user journey  
**Hosting:** S3 + CloudFront CDN
