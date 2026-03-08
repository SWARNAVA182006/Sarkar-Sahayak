# GovSaathi Frontend

Mobile-optimized React web application for GovSaathi AI.

## Features

- **Language Selection**: Choose from 6 Indian languages
- **Voice Input**: Web Speech API for voice queries
- **Semantic Search**: AI-powered scheme matching
- **Voice Output**: Listen to explanations in Hindi
- **Document Upload**: Auto-fill profile from Aadhaar/ration card
- **Authentication**: Secure Cognito-based login
- **Responsive Design**: Works on mobile and desktop

## Tech Stack

- React 18
- TypeScript
- Vite
- AWS Amplify
- React Router
- Axios

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env` file:

```
VITE_API_URL=https://your-api-url.com/prod
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_AWS_REGION=us-east-1
```

## Deployment

Frontend is deployed to S3 + CloudFront via Phase 4 CDK stack.

```bash
bash scripts/deploy-phase4.sh
```

## Pages

- **Home** (`/`) - Language selection and search
- **Results** (`/results`) - Matched schemes list
- **Scheme Detail** (`/scheme/:id`) - Detailed scheme info with voice
- **Profile** (`/profile`) - User profile and document upload

## Components

- Language selector
- Voice input button
- Scheme cards with match scores
- Audio player for voice output
- Document upload with preview
- Loading states
- Error handling

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Voice output for screen readers
- High contrast support
