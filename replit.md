# مركز اضواء الساير للعلاج الطبيعي والمساند الطبية

## Overview
A patient management system (PWA) for Al-Sayer Physical Therapy and Medical Aids Center. The application allows staff to register patients, track their treatment sessions, medical aids, and manage payments - all with full Arabic RTL support and offline capability.

## Key Features
- **Patient Registration**: Complete patient information form including personal details, doctor information, diagnosis
- **Surgery Tracking**: Record surgical history and surgery types
- **Medical Care Management**: Track home exercises or therapy sessions (equipment or exercise-based)
- **Medical Aids**: Track medical support devices/aids with pricing
- **Diet Plans**: Optional dietary plan tracking for patients
- **Image Attachments**: Upload X-rays and medical imaging
- **Financial Tracking**: Automatic calculation of total costs with itemized breakdown, track payments received
- **PWA Support**: Works offline with service worker, installable on mobile devices
- **RTL Arabic Interface**: Full right-to-left layout with Arabic typography
- **Google Sheets Integration**: Automatic sync of patient data to Google Sheets for backup and reporting
- **Telegram Notifications**: Automatic notifications sent to Telegram on patient create/update/delete
- **Local Storage Caching**: Patient data cached locally for offline access

## Tech Stack
- **Frontend**: React with TypeScript, Vite, TanStack Query
- **Backend**: Express.js with PostgreSQL database (Drizzle ORM)
- **Database**: PostgreSQL with persistent storage
- **Styling**: Tailwind CSS with shadcn/ui components
- **Forms**: react-hook-form with Zod validation
- **Typography**: Noto Sans Arabic font
- **Integrations**: Google Sheets API, Telegram Bot API

## Project Structure
```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── header.tsx    # Main header with center logo
│   │   ├── theme-provider.tsx  # Dark/Light theme context
│   │   ├── theme-toggle.tsx    # Theme switch button
│   │   ├── image-upload.tsx    # Image upload with drag-drop
│   │   └── ui/           # shadcn/ui components
│   ├── lib/
│   │   ├── queryClient.ts    # TanStack Query setup
│   │   └── localStorage.ts   # Local storage utilities for offline caching
│   ├── pages/
│   │   └── home.tsx      # Main patient form page
│   └── App.tsx           # Root component with routing
├── public/
│   └── manifest.json     # PWA manifest
└── index.html            # HTML entry with Arabic support

server/
├── routes.ts             # API endpoints with integration triggers
├── storage.ts            # PostgreSQL storage interface
├── db.ts                 # Database connection
├── google-sheets.ts      # Google Sheets sync (Service Account method)
├── google-sheets-webhook.ts  # Google Sheets sync (Webhook method - for regions without Google Cloud)
└── telegram.ts           # Telegram notification integration

shared/
└── schema.ts             # Data models and validation (Drizzle + Zod)
```

## API Endpoints
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Create new patient (syncs to Google Sheets + sends Telegram notification)
- `PATCH /api/patients/:id` - Update patient (syncs to Google Sheets + sends Telegram notification)
- `DELETE /api/patients/:id` - Delete patient (removes from Google Sheets + sends Telegram notification)
- `POST /api/sync-to-sheets` - Manual sync all patients to Google Sheets
- `GET /api/today-summary` - Get today's patient count and total amount
- `POST /api/send-daily-summary` - Manually trigger daily summary to Telegram

## Running the Application
The application starts with `npm run dev` which runs both frontend and backend on port 5000.

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Target chat ID for notifications
- Google Sheets - Two methods available:
  - **Replit (OAuth)**: Uses Replit connector automatically
  - **Render/External (Webhook)**: Set `GOOGLE_SHEETS_WEBHOOK_URL` to Apps Script Web App URL
  - **Render/External (Service Account)**: Set `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SPREADSHEET_ID`

## Data Model
Patient records include:
- Personal info: patientName, age, residence, phone
- Medical info: doctor name, diagnosis, doctor request
- Surgery: hasSurgery flag, surgeryType
- Medical care: careType (home exercises/sessions), sessionType, sessionCount, sessionPrice
- Medical aids: aidType, aidPrice
- Diet: hasDiet flag, dietPlan
- Attachments: array of base64 image strings
- Financial: totalAmount (calculated), totalReceived

## External Deployment
The application can be deployed independently on Render.com or similar platforms:
- See `COMPLETE_DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions (Arabic)
- See `DEPLOYMENT_GUIDE.md` for quick reference
- See `render.yaml` for Render.com configuration
- Google Sheets uses Service Account authentication for external deployments
- Health check endpoint: `GET /api/health`

## Recent Changes
- Migrated from in-memory to PostgreSQL persistent storage
- Added Google Sheets integration for automatic data sync
- Added Telegram bot integration for real-time notifications
- Added local storage caching for offline data persistence
- Added optional diet/nutrition tracking section
- Enhanced financial summary with itemized breakdown
- Added manual sync button for Google Sheets
- Added patient detail view dialog with full information and registration timestamp
- Added daily summary scheduler (11 PM) to send patient count to Telegram
- Added "other services" section for flexible pricing beyond therapy/medical aids
- Added external deployment support (Render.com) with Service Account authentication
- Added payment editing feature to update received amounts for existing patients
- Removed standalone offline app (consolidated into main PWA)
- Added Google Sheets webhook method for regions without Google Cloud Console access (see GOOGLE_SHEETS_SETUP_ARABIC.md)
- Added payment history tracking with separate payments table and add/delete functionality
- Added delete patient feature with confirmation dialog
- Added mark patient as "completed" (انتهاء المراجعات) with visual status badge
