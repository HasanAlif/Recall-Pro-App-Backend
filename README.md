<p align="center">
  <img src="https://img.icons8.com/color/96/scissors.png" alt="Recall Pro Logo" width="80"/>
</p>

<h1 align="center">Recall Pro - Salon Management System</h1>

<p align="center">
  <strong>A production-ready, full-featured salon management backend API built with modern technologies</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="GCS"/>
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary"/>
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" alt="Zod"/>
</p>

---

## Overview

**Recall Pro** is a comprehensive salon management backend system designed to help beauty professionals track their clients, manage appointments, analyze business performance, and handle subscription-based monetization. This project demonstrates enterprise-level architecture, clean code practices, and integration with multiple cloud services.

### Live Dashboard
**Production URL:** [https://dashboard.recallproapp.com](https://dashboard.recallproapp.com)

---

## Key Features

### Authentication & Security
- **Dual Authentication System** - Local email/password registration with OTP email verification + Google OAuth 2.0 social login
- **JWT-Based Authorization** - Secure token-based authentication with role-based access control (USER/ADMIN)
- **Password Security** - bcrypt hashing with configurable salt rounds, secure password reset flow with time-limited OTPs
- **Multi-Source Token Extraction** - Supports Bearer token, HTTP-only cookies, and custom headers

### Client Management System
- **Full CRUD Operations** - Create, read, update, and delete client profiles with profile pictures
- **Smart Search Algorithm** - Fuzzy search with weighted scoring (exact match > prefix match > contains)
- **Aggregation Pipelines** - MongoDB aggregations for efficient data retrieval with joined visit information
- **ReDoS Protection** - Escaped regex patterns to prevent Regular Expression Denial of Service attacks

### Client Visit Tracking
- **Comprehensive Visit Records** - Track services, duration, pricing, tips, and notes per visit
- **Multi-Media Support**:
  - **Photos** - Uploaded to Cloudinary with automatic optimization
  - **Videos** - Uploaded to Google Cloud Storage with 7-day signed URLs
- **Smart URL Caching** - Cached signed video URLs with automatic background refresh before expiration
- **Service Analytics** - Aggregate total spending, visit counts, and service history per client

### Subscription & Monetization
- **Flexible Plan Structure**:
  - Trial Plan (30-day, one-time only)
  - Basic Monthly/Annual Plans
  - Premium Monthly/Annual Plans
- **Automated Expiry Management** - Daily cron job checks and transitions expired plans
- **Trial Guard** - Prevents reactivation of trial after first use

### Business Analytics Dashboard
- **Earnings Insights** - Track revenue with filters (today, 7-days, 30-days, all-time)
- **Growth Metrics** - Period-over-period comparison with growth percentage calculations
- **Revenue Breakdown** - Daily revenue breakdown by month with service vs tips split
- **Tips Analysis** - Tips percentage relative to total earnings

### Admin Portal
- **Dashboard Overview** - Total users, active/inactive counts, subscriber metrics
- **User Growth Charts** - Monthly new user registrations by year
- **Premium User Analytics** - Track subscription conversions with billing cycle insights
- **Content Management** - Manage About Us, Privacy Policy, and Terms & Conditions
- **User Search** - Search all users or filter premium subscribers with pagination

### Cloud Infrastructure
- **Multi-Cloud File Storage**:
  - **Cloudinary** - Image uploads with auto-optimization and format selection
  - **Google Cloud Storage** - Video storage with v4 signed URLs for secure access
  - **DigitalOcean Spaces** - S3-compatible fallback storage
- **Background Jobs**:
  - Plan expiry checker (daily at midnight)
  - Video URL refresh (every 6 days to prevent expiration)

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Language** | TypeScript |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT, Google OAuth 2.0 |
| **Validation** | Zod (Schema validation) |
| **File Upload** | Multer, Cloudinary SDK, Google Cloud Storage SDK |
| **Email** | Nodemailer (Gmail SMTP) |
| **Scheduling** | node-cron |
| **Security** | bcrypt, CORS, HTTP-only cookies |

---

## Architecture

```
src/
├── app/
│   ├── middlewares/         # Auth, validation, error handling
│   ├── models/              # Mongoose schemas
│   ├── modules/             # Feature modules (modular architecture)
│   │   ├── admin/           # Admin dashboard & content management
│   │   ├── analytics/       # Business analytics & reporting
│   │   ├── auth/            # Authentication & authorization
│   │   ├── client/          # Client management
│   │   ├── clientVisit/     # Visit tracking with media
│   │   ├── profile/         # User profile management
│   │   └── user/            # User registration & plans
│   └── routes/              # API route definitions
├── config/                  # Environment configuration
├── errors/                  # Custom error classes & handlers
├── helpars/                 # Helper utilities (JWT, pagination, file upload)
├── interfaces/              # TypeScript interfaces
├── shared/                  # Shared utilities (DB, email, response)
├── utils/                   # Utilities (cron jobs, templates)
├── app.ts                   # Express application setup
└── server.ts                # Server entry point with graceful shutdown
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login with email/password |
| POST | `/api/auth/social-login` | Google OAuth social login |
| POST | `/api/auth/forgot-password` | Request password reset OTP |
| POST | `/api/auth/verify-otp` | Verify password reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| POST | `/api/auth/change-password` | Change password (authenticated) |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user with OTP |
| POST | `/api/users/verify-registration` | Verify registration OTP |
| POST | `/api/users/resend-otp` | Resend registration OTP |
| PATCH | `/api/users/plan` | Update subscription plan |

### Client Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/clients` | Create new client |
| GET | `/api/clients` | Get all clients (paginated) |
| GET | `/api/clients/search` | Search clients by name |
| GET | `/api/clients/home` | Get homepage dashboard data |
| PATCH | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |

### Client Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/client-visits` | Create visit with media |
| GET | `/api/client-visits` | Get visits for client |
| GET | `/api/client-visits/all` | Get all visits (paginated) |
| GET | `/api/client-visits/:id` | Get visit details |
| GET | `/api/client-visits/search` | Search by service type |
| GET | `/api/client-visits/service-types` | Get unique service types |
| PATCH | `/api/client-visits/:id` | Update visit |
| DELETE | `/api/client-visits/:id` | Delete visit |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get earnings analytics |
| GET | `/api/analytics/revenue-breakdown` | Get monthly revenue breakdown |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard overview stats |
| GET | `/api/admin/users` | Get all users (paginated) |
| GET | `/api/admin/users/search` | Search users by name |
| GET | `/api/admin/premium-users` | Get premium subscribers |
| GET | `/api/admin/user-growth` | Monthly user growth data |
| GET | `/api/admin/premium-growth` | Monthly premium user growth |

---

## Key Technical Implementations

### Smart Search with Weighted Scoring
```typescript
// MongoDB aggregation with weighted fuzzy search
$addFields: {
  score: {
    $switch: {
      branches: [
        { case: { $regexMatch: { input: "$fullName", regex: `^${escaped}$`, options: "i" } }, then: 3 }, // Exact
        { case: { $regexMatch: { input: "$fullName", regex: `^${escaped}`, options: "i" } }, then: 2 },  // Prefix
      ],
      default: 1  // Contains
    }
  }
}
```

### Signed URL Caching System
```typescript
// Efficient video URL management with caching
const getCachedOrFreshSignedVideos = async (visit: any): Promise<string[]> => {
  // Return cached URLs if still valid (>1 day remaining)
  if (visit.signedVideos?.length && visit.videoUrlsExpiry > oneDayFromNow) {
    return visit.signedVideos;
  }
  // Generate fresh 7-day signed URLs and cache in background
  const signed = await Promise.all(videos.map(generateSignedUrl));
  ClientVisit.findByIdAndUpdate(visit._id, { signedVideos: signed, videoUrlsExpiry: sevenDaysFromNow });
  return signed;
};
```

### Graceful Server Recovery
```typescript
// Self-healing server with graceful shutdown
process.on('uncaughtException', (error) => {
  server.close(() => restartServer());
});
process.on('SIGTERM', () => exitHandler());
```

---

## Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Google Cloud Storage
GCS_PROJECT_ID=...
GCS_BUCKET_NAME=...
GCS_KEY_FILE=google-cloud-key.json

# Email (Gmail SMTP)
MAIL_EMAIL=...
MAIL_APP_PASS=...
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Cloud Platform account
- Cloudinary account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/recall-pro-backend.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

---

## Security Features

- **Password Hashing** - bcrypt with configurable salt rounds
- **JWT Tokens** - Secure token generation with expiration
- **OTP Verification** - Time-limited (15 min) one-time passwords
- **Role-Based Access** - USER and ADMIN role authorization
- **ReDoS Protection** - Escaped regex patterns in all search endpoints
- **Input Validation** - Zod schema validation on all endpoints
- **CORS Configuration** - Whitelist-based origin control
- **Account Status Checks** - Block/inactive account handling

---

## Performance Optimizations

- **Database Indexing** - Compound indexes on frequently queried fields
- **Aggregation Pipelines** - Efficient MongoDB aggregations instead of multiple queries
- **Parallel Queries** - Promise.all() for independent database operations
- **Signed URL Caching** - Reduces GCS API calls by caching video URLs
- **Background Jobs** - Non-blocking cron tasks for maintenance
- **File Streaming** - Memory-efficient file uploads with streams

---

## Author

**Mehedi Hasan Alif**
(Backend Developer)

Built with passion using modern technologies and best practices for scalable, maintainable code.

---

## License

This project is licensed under the ISC License.

---

<p align="center">
  <strong>Recall Pro</strong> - Empowering salon professionals with smart client management
</p>
