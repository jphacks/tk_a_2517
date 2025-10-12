# Vercel Deployment Guide - Dual Application Setup

This project consists of two independent Next.js applications that can be deployed separately on Vercel.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend App  │    │   QR Alert App  │
│   (Port 3000)   │    │   (Port 5000)   │
│                 │    │                 │
│ - Main App      │    │ - QR Dashboard  │
│ - User Features │    │ - Robot Diag    │
│ - Core Features │    │ - 3D Visual     │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
            ┌─────────────────┐
            │   Vercel CDN    │
            │                 │
            │ - Global Edge   │
            │ - Auto Scaling  │
            │ - SSL/HTTPS     │
            └─────────────────┘
```

## Deployment Strategy

### Option 1: Separate Vercel Projects (Recommended)

**Frontend Application**
```bash
cd frontend
vercel --prod
# Deploys to: https://your-frontend-app.vercel.app
```

**QR Alert Application**
```bash
cd QR_alert
vercel --prod
# Deploys to: https://your-qr-alert-app.vercel.app
```

### Option 2: Monorepo with Multiple Apps

Create a single Vercel project with multiple apps:

```json
// vercel.json (root level)
{
  "projects": [
    {
      "source": "frontend",
      "framework": "nextjs"
    },
    {
      "source": "QR_alert", 
      "framework": "nextjs"
    }
  ]
}
```

## Benefits of Separate Deployment

1. **Independent Scaling**: Each app scales based on its own traffic
2. **Separate Domains**: Different URLs for different purposes
3. **Independent Updates**: Deploy updates to one app without affecting the other
4. **Resource Isolation**: Each app has its own resources and limits
5. **Team Management**: Different teams can manage different apps

## User Experience Flow

1. **Main Application**: Users access your primary frontend at `app.yourdomain.com`
2. **QR Alert Access**: Users can access QR Alert at `qr-alert.yourdomain.com`
3. **QR Code Sharing**: QR codes can link directly to machine diagnostics
4. **Cross-App Integration**: Apps can link to each other if needed

## Custom Domain Setup

### Frontend App
- Domain: `app.yourdomain.com` or `yourdomain.com`
- Purpose: Main application functionality

### QR Alert App  
- Domain: `qr-alert.yourdomain.com` or `monitor.yourdomain.com`
- Purpose: Machine diagnostics and monitoring

## Environment Configuration

### Frontend App Environment
```bash
# In Vercel dashboard for frontend project
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_QR_ALERT_URL=https://qr-alert.yourdomain.com
```

### QR Alert App Environment
```bash
# In Vercel dashboard for QR Alert project
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NODE_ENV=production
```

## Development Workflow

1. **Local Development**: Run both apps locally on different ports
2. **Testing**: Test integration between apps
3. **Deployment**: Deploy each app independently
4. **Monitoring**: Monitor each app separately in Vercel dashboard

## Performance Considerations

- **CDN**: Both apps benefit from Vercel's global CDN
- **Edge Functions**: API routes run at edge locations
- **Image Optimization**: Next.js Image component works on both apps
- **Bundle Splitting**: Each app has its own optimized bundle

## Security

- **HTTPS**: Automatic SSL certificates for both apps
- **Environment Variables**: Secure handling of secrets
- **CORS**: Configure cross-origin requests if needed
- **API Protection**: Secure API endpoints with authentication if required

This setup provides maximum flexibility and allows each application to evolve independently while maintaining a cohesive user experience.
