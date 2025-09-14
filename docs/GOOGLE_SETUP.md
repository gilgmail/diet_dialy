# Google Cloud Console Setup for Diet Daily

This guide walks you through setting up Google Cloud Console for Diet Daily's medical data integration.

## Prerequisites

- Google account with access to Google Cloud Console
- Diet Daily project deployed or running locally
- Basic understanding of OAuth 2.0 authentication

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select an existing project
3. Project name: `Diet Daily Medical App` (or your preferred name)
4. Note down your **Project ID** - you'll need this later

## Step 2: Enable Required APIs

Navigate to **APIs & Services > Library** and enable these APIs:

### Required APIs:
- **Google Sheets API** - For medical data storage
- **Google Drive API** - For photo and document storage
- **Google+ API** (or Google People API) - For user authentication

### How to enable each API:
1. Search for the API name in the library
2. Click on the API
3. Click "Enable"
4. Wait for activation (usually takes 1-2 minutes)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill out the required information:

### App Information:
```
App name: Diet Daily
User support email: your-email@example.com
Developer contact information: your-email@example.com
```

### App Domain (for production):
```
Application home page: https://yourdomain.com
Application privacy policy: https://yourdomain.com/privacy
Application terms of service: https://yourdomain.com/terms
```

### Scopes:
Click "Add or Remove Scopes" and add:
- `../auth/userinfo.email`
- `../auth/userinfo.profile`
- `../auth/spreadsheets`
- `../auth/drive.file`
- `../auth/drive.metadata.readonly`

### Test Users (for development):
Add your Google account email for testing

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Application type: **Web application**
4. Name: `Diet Daily OAuth Client`

### Authorized JavaScript origins:
```
# Development
http://localhost:3000
http://localhost:3001

# Production (replace with your domain)
https://yourdomain.com
https://www.yourdomain.com
```

### Authorized redirect URIs:
```
# Development
http://localhost:3000/auth/google/callback

# Production (replace with your domain)
https://yourdomain.com/auth/google/callback
```

5. Click "Create"
6. **Save your Client ID and Client Secret** - you'll need these for environment variables

## Step 5: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Google credentials:

```bash
# From Step 4 - OAuth 2.0 credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Match your redirect URI exactly
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## Step 6: Test the Integration

1. Start your Diet Daily app:
   ```bash
   npm run dev
   ```

2. Navigate to the Google authentication page
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. Grant the requested permissions
6. You should be redirected back to Diet Daily with successful authentication

## Step 7: Verify Permissions

Test that the app can:
- ✅ Create Google Sheets for medical data
- ✅ Upload files to Google Drive
- ✅ Read user profile information

## Security Considerations for Medical Data

### HIPAA Compliance Recommendations:

1. **Data Encryption**: All medical data is encrypted client-side before storage
2. **Access Controls**: Users own their data in their Google accounts
3. **Audit Logging**: Google provides access logs for data access
4. **Data Retention**: Users control data retention through their Google account

### Privacy Best Practices:

1. **Minimal Data Collection**: Only request necessary permissions
2. **Transparent Privacy Policy**: Clearly explain data usage
3. **User Control**: Users can revoke access at any time
4. **No Central Storage**: Medical data stays in user's Google account

## Production Deployment Checklist

### Before Going Live:

- [ ] Update OAuth consent screen with production URLs
- [ ] Add production redirect URIs to OAuth client
- [ ] Update environment variables for production
- [ ] Test authentication flow in production environment
- [ ] Verify SSL certificates are working
- [ ] Test data encryption/decryption in production
- [ ] Verify Google API quotas are sufficient
- [ ] Set up monitoring for API usage

### Security Review:

- [ ] Client secret is secure and not exposed
- [ ] Redirect URIs are exact matches
- [ ] Scopes are minimal and necessary
- [ ] Encryption keys are properly generated
- [ ] Error handling doesn't expose sensitive data
- [ ] Audit logging is enabled

## API Quotas and Limits

### Google Sheets API:
- **Read requests**: 100 requests per 100 seconds per user
- **Write requests**: 100 requests per 100 seconds per user
- **Daily quota**: Generous limits for personal use

### Google Drive API:
- **Queries per day**: 1,000,000,000
- **Queries per 100 seconds per user**: 1,000
- **File upload size**: 750GB per file

### If You Hit Limits:
1. Request quota increase in Google Cloud Console
2. Implement exponential backoff in API calls
3. Cache data locally when possible

## Troubleshooting

### Common Issues:

**"Error 400: invalid_request"**
- Check that redirect URI exactly matches configured URI
- Ensure Client ID is correct

**"Error 403: access_denied"**
- User denied permissions
- Check OAuth consent screen configuration

**"API not enabled"**
- Enable required APIs in Google Cloud Console
- Wait a few minutes for APIs to activate

**"Invalid client secret"**
- Verify GOOGLE_CLIENT_SECRET environment variable
- Ensure client secret hasn't been regenerated

### Debug Steps:

1. Check browser developer tools for JavaScript errors
2. Verify environment variables are loaded correctly
3. Test OAuth flow in Google OAuth Playground
4. Check Google Cloud Console audit logs
5. Verify API quotas haven't been exceeded

## Support and Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Google API Client Libraries](https://developers.google.com/api-client-library)

## Medical Data Privacy Notice

**Important**: This integration is designed for personal medical data management. Users maintain full ownership and control of their medical data through their Google accounts. Diet Daily does not store medical data on its servers and uses client-side encryption for additional protection.

For questions about medical data privacy, please review our [Privacy Policy](../PRIVACY.md) and consult with your healthcare provider about using digital health tools.

---

**Last updated**: {current_date}
**Version**: 1.0.0