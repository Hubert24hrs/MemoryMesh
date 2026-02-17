# 🚀 MemoryMesh Enhanced - Deployment Guide

## Complete Production Deployment Checklist

This guide covers everything needed to deploy MemoryMesh Enhanced to production.

---

## 📋 Pre-Deployment Checklist

### 1. Accounts Setup

- [ ] **Expo Account**: Sign up at https://expo.dev/
- [ ] **Supabase Project**: Create at https://supabase.com/
- [ ] **Pinecone Account**: Create at https://www.pinecone.io/
- [ ] **Anthropic API**: Get key at https://console.anthropic.com/
- [ ] **Moonshot (Kimi) API**: Get key at https://platform.moonshot.cn/
- [ ] **OpenAI API**: Get key at https://platform.openai.com/
- [ ] **RevenueCat Account**: Setup at https://app.revenuecat.com/
- [ ] **Google AdMob**: Setup at https://admob.google.com/
- [ ] **Sentry Project**: Create at https://sentry.io/
- [ ] **Apple Developer Program**: $99/year at https://developer.apple.com/
- [ ] **Google Play Console**: $25 one-time at https://play.google.com/console/

### 2. Repository Setup

```bash
# Clone repository
git clone https://github.com/yourusername/memorymesh-enhanced.git
cd memorymesh-enhanced

# Install dependencies
npm install

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

---

## 🔧 Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.example .env.local
```

### Step 2: Fill In All Keys

Open `.env.local` and add all your API keys. **Critical keys:**

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key

# AI Providers
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-api03-xxx
EXPO_PUBLIC_KIMI_API_KEY=your-key
EXPO_PUBLIC_OPENAI_API_KEY=sk-xxx

# Pinecone
EXPO_PUBLIC_PINECONE_API_KEY=your-key
EXPO_PUBLIC_PINECONE_ENVIRONMENT=us-east-1-aws
EXPO_PUBLIC_PINECONE_INDEX=memorymesh-memories

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

### Step 3: Validate Environment

```bash
# Run validation script (if available)
npm run validate-env

# Or manually test
npm start
```

---

## 🗄️ Database Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details
4. Wait for provisioning (~2 minutes)

### Step 2: Run Migrations

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run manually in Supabase SQL editor
# Copy content from: supabase/migrations/001_enhanced_schema.sql
```

### Step 3: Set Up Row-Level Security

```sql
-- Enable RLS on all tables (already in migration)
-- Verify in Supabase Dashboard > Authentication > Policies
```

### Step 4: Create Storage Buckets

```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('memory-media', 'memory-media', false),
  ('user-avatars', 'user-avatars', true),
  ('data-exports', 'data-exports', false);

-- Set storage policies
CREATE POLICY "Users can upload own media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memory-media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 🧠 AI Setup

### Step 1: Pinecone Index

```bash
# Create index via Pinecone Console
# Or use API:
curl -X POST 'https://api.pinecone.io/indexes' \
  -H 'Api-Key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "memorymesh-memories",
    "dimension": 1536,
    "metric": "cosine",
    "spec": {
      "serverless": {
        "cloud": "aws",
        "region": "us-east-1"
      }
    }
  }'
```

### Step 2: Test AI Providers

```typescript
// Test in Node.js or test file
import { aiOrchestrator } from './src/services/ai/AIProvider';

// Test transcription
const result = await aiOrchestrator.transcribeAudio('audio-url');
console.log('Transcription:', result);

// Test context extraction
const context = await aiOrchestrator.extractContext('Test memory text');
console.log('Context:', context);
```

---

## 💰 Monetization Setup

### Step 1: RevenueCat Products

1. Go to https://app.revenuecat.com/
2. Create app for iOS and Android
3. Create products:
   - `com.memorymesh.pro.monthly` - $9.99/month
   - `com.memorymesh.lifetime` - $49.99 one-time

### Step 2: App Store Connect Setup (iOS)

1. Go to https://appstoreconnect.apple.com/
2. Create In-App Purchases:
   - **Type**: Auto-Renewable Subscription
   - **Product ID**: `com.memorymesh.pro.monthly`
   - **Price**: $9.99
   - **Duration**: 1 month
3. Create Lifetime Purchase:
   - **Type**: Non-Consumable
   - **Product ID**: `com.memorymesh.lifetime`
   - **Price**: $49.99

### Step 3: Google Play Console Setup (Android)

1. Go to https://play.google.com/console/
2. Create In-App Products:
   - **Type**: Subscription
   - **Product ID**: `com.memorymesh.pro.monthly`
   - **Price**: $9.99
3. Create Lifetime Purchase:
   - **Type**: In-app product
   - **Product ID**: `com.memorymesh.lifetime`
   - **Price**: $49.99

### Step 4: Link RevenueCat

```bash
# In RevenueCat dashboard:
# 1. Apps > [Your App] > Configure
# 2. Add App Store Connect credentials
# 3. Add Google Play credentials
# 4. Link products
```

---

## 📱 Build Configuration

### Step 1: Update app.json

```json
{
  "expo": {
    "name": "MemoryMesh",
    "slug": "memorymesh",
    "version": "2.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.memorymesh",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.memorymesh",
      "versionCode": 1
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### Step 2: Configure EAS Build

```bash
# Initialize EAS
eas build:configure

# This creates eas.json (already exists in repo)
```

### Step 3: Setup Credentials

```bash
# iOS credentials
eas credentials

# Select:
# - iOS App Store
# - Production
# - Setup Push Notifications
# - Setup App Signing

# Android credentials
eas credentials -p android

# Generate new keystore or upload existing
```

---

## 🏗️ Building the App

### Development Build

```bash
# iOS Development
eas build --platform ios --profile development

# Android Development
eas build --platform android --profile development

# Install on device
eas build:run --platform ios --latest
```

### Preview Build (Internal Testing)

```bash
# Both platforms
eas build --platform all --profile preview

# This creates:
# - iOS: .ipa file (Ad Hoc distribution)
# - Android: .apk file
```

### Production Build

```bash
# iOS App Store
eas build --platform ios --profile production

# Android Play Store
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

**Build times:**
- iOS: ~15-20 minutes
- Android: ~10-15 minutes

---

## 📤 Submission to App Stores

### iOS App Store Submission

#### Step 1: Prepare Assets

```bash
# App Icon: 1024x1024 (no alpha channel)
# Screenshots for:
# - iPhone 6.7" (1290 x 2796)
# - iPhone 6.5" (1284 x 2778)
# - iPhone 5.5" (1242 x 2208)
# - iPad Pro 12.9" (2048 x 2732)
```

#### Step 2: App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Create New App:
   - **Platform**: iOS
   - **Name**: MemoryMesh
   - **Primary Language**: English
   - **Bundle ID**: com.yourcompany.memorymesh
   - **SKU**: memorymesh-ios

3. Fill in app information:
   - **Category**: Productivity
   - **Privacy Policy URL**: https://memorymesh.app/privacy
   - **Support URL**: https://memorymesh.app/support

4. Upload screenshots and description

#### Step 3: Submit Build

```bash
# Submit via EAS
eas submit --platform ios

# Or manually:
# 1. Download .ipa from EAS dashboard
# 2. Upload to App Store Connect via Transporter app
# 3. Select build in App Store Connect
# 4. Submit for review
```

### Android Play Store Submission

#### Step 1: Prepare Assets

```bash
# App Icon: 512x512
# Feature Graphic: 1024x500
# Screenshots for:
# - Phone: 1080 x 1920 minimum
# - 7" Tablet: 1920 x 1200
# - 10" Tablet: 2560 x 1800
```

#### Step 2: Play Console

1. Go to https://play.google.com/console/
2. Create New App:
   - **App Name**: MemoryMesh
   - **Default Language**: English (US)
   - **App Type**: App

3. Fill in store listing:
   - **Short Description**: (80 chars max)
   - **Full Description**: (4000 chars max)
   - **Category**: Productivity
   - **Privacy Policy**: https://memorymesh.app/privacy

#### Step 3: Submit Build

```bash
# Submit via EAS
eas submit --platform android

# This uploads AAB to Play Console
# Then manually:
# 1. Go to Play Console > Production
# 2. Create new release
# 3. Review and rollout
```

---

## 🔔 Push Notifications Setup

### Step 1: Expo Push Notifications

```bash
# Already configured in app.json
# Expo handles FCM (Android) and APNs (iOS)
```

### Step 2: Test Notifications

```bash
# Use Expo Push Notification Tool
# https://expo.dev/notifications

# Or via API:
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "ExponentPushToken[xxxxxx]",
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

---

## 📊 Analytics & Monitoring

### Step 1: Sentry Setup

```bash
# Already configured in App.tsx
# Verify errors are being tracked:
# https://sentry.io/organizations/[org]/projects/[project]
```

### Step 2: Mixpanel Setup

```bash
# Events are tracked automatically
# Verify in Mixpanel dashboard:
# https://mixpanel.com/project/[project]/
```

---

## 🧪 Testing Before Launch

### Automated Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### Manual Testing Checklist

- [ ] Authentication flow (signup, login, biometric)
- [ ] Memory creation (voice, text, image)
- [ ] AI processing (transcription, context extraction)
- [ ] Search functionality (text and semantic)
- [ ] Offline mode
- [ ] Proactive notifications
- [ ] Subscription flow (IAP)
- [ ] Ad display (free users)
- [ ] Data export
- [ ] Account deletion

### Beta Testing

```bash
# iOS TestFlight
# 1. In App Store Connect > TestFlight
# 2. Add internal testers
# 3. Share TestFlight link

# Android Internal Testing
# 1. In Play Console > Testing > Internal testing
# 2. Add testers by email
# 3. Share opt-in link
```

---

## 🚀 Launch Day

### Step 1: Final Checks

- [ ] All API keys in production environment
- [ ] Database backups configured
- [ ] Error monitoring active
- [ ] Analytics tracking verified
- [ ] Push notifications working
- [ ] In-app purchases tested
- [ ] Privacy policy live
- [ ] Support email configured

### Step 2: Soft Launch

1. Release to small group (10-100 users)
2. Monitor for critical issues
3. Fix any bugs quickly
4. Gather initial feedback

### Step 3: Full Launch

1. Release to all regions
2. Submit press release
3. Post on Product Hunt
4. Share on social media
5. Notify your email list

---

## 📈 Post-Launch Monitoring

### Week 1 Checklist

- [ ] Monitor crash rate (<1%)
- [ ] Check conversion rates
- [ ] Review user feedback
- [ ] Fix critical bugs
- [ ] Optimize AI costs
- [ ] Analyze retention metrics

### Ongoing Maintenance

```bash
# Weekly
- Review analytics
- Check error logs
- Monitor API costs
- Update content

# Monthly
- Release updates
- Review metrics
- Plan new features
- Optimize performance
```

---

## 🆘 Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
eas build:clear-cache
npm run clean
npm install
eas build --platform all --profile production
```

### Submission Rejection

**Common iOS rejections:**
- Missing privacy descriptions
- Crashes on launch
- In-app purchase issues
- Guideline violations

**Fix and resubmit:**
```bash
# Fix issues
# Increment build number in app.json
eas build --platform ios --profile production
eas submit --platform ios
```

---

## 📞 Support Contacts

- **Expo Support**: https://expo.dev/support
- **Supabase Support**: https://supabase.com/support
- **RevenueCat Support**: https://www.revenuecat.com/docs
- **App Store Review**: https://developer.apple.com/contact/app-store/
- **Play Store Support**: https://support.google.com/googleplay/android-developer/

---

## ✅ Deployment Complete!

Your app is now live on both app stores! 🎉

**Next steps:**
1. Monitor analytics daily
2. Respond to user reviews
3. Plan version 2.1 features
4. Scale backend infrastructure as needed

---

**Document Version:** 1.0
**Last Updated:** 2025-02-17
**Author:** MemoryMesh Team
