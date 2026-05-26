# Google Cloud CLI Setup for OAuth 2.0

This guide walks you through creating a Google OAuth 2.0 Web Client ID using
the Google Cloud CLI (`gcloud`) and Cloud Console, then wiring it into Vercel.

---

## Prerequisites

Install the Google Cloud CLI:

```bash
# Windows (PowerShell as Administrator)
winget install Google.CloudSDK

# Or download from: https://cloud.google.com/sdk/docs/install
```

---

## Step 1 — Authenticate and select a project

```bash
# Log in to your Google account
gcloud auth login

# List your existing projects
gcloud projects list

# Either create a new project:
gcloud projects create thermometer-app-YOUR_ID --name="Thermometer App"

# Or reuse an existing one:
gcloud config set project YOUR_PROJECT_ID
```

---

## Step 2 — Enable required APIs

```bash
gcloud services enable oauth2.googleapis.com
gcloud services enable people.googleapis.com
```

---

## Step 3 — Configure the OAuth consent screen

The consent screen must be configured in the Cloud Console (the CLI does not
support this step for external user-type apps):

1. Go to: [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **External** → **Create**
3. Fill in:
  - **App name**: Emotion Thermometer
  - **User support email**: your email
  - **Developer contact email**: your email
4. Click **Save and Continue** through all steps (scopes can be left default)
5. On the Summary page, click **Back to Dashboard**

---

## Step 4 — Create the OAuth 2.0 Web Client ID

Run this in Cloud Shell or via the REST API. The Cloud Console UI is the most
reliable path for web clients:

1. Go to: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Thermometer Web`
5. **Authorized redirect URIs** — add both:
  - `http://localhost:3000/api/auth/callback` (local dev)
  - `https://your-vercel-app.vercel.app/api/auth/callback` (production)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

---

## Step 5 — Add credentials to Vercel

```bash
# Add to Production environment
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production

# Add to Development environment (for `vercel dev`)
vercel env add GOOGLE_CLIENT_ID development
vercel env add GOOGLE_CLIENT_SECRET development

# Generate and add a JWT secret (run in PowerShell or bash)
# PowerShell:
$secret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host $secret

vercel env add JWT_SECRET production
vercel env add JWT_SECRET development
```

---

## Step 6 — Add Turso credentials to Development environment

The Turso env vars are currently only in Production. Add them for local dev:

```bash
vercel env add thermometer_TURSO_DATABASE_URL development
vercel env add thermometer_TURSO_AUTH_TOKEN development
```

Get the values from: [https://app.turso.tech](https://app.turso.tech) → your database → Connection details

---

## Step 7 — Pull updated env vars and run locally

```bash
vercel env pull .env.local --yes
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and click **Sign in with Google**.

---

## Step 8 — Deploy to Vercel

```bash
vercel --prod
```

The app will automatically use the production credentials and redirect to your
Vercel deployment URL.