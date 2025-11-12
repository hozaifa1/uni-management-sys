# IGMIS LMS - Frontend

React + Vite frontend for the IGMIS Learning Management System.

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment to Netlify

### Quick Deploy

1. **Build Settings** (in Netlify dashboard):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18

2. **Environment Variables** (IMPORTANT!):
   ```
   VITE_API_URL=https://your-railway-backend-url.railway.app/api
   ```

3. **Deploy**:
   - Connect your Git repository
   - Netlify will auto-deploy on every push

### Important: Environment Variables

⚠️ **After updating environment variables in Netlify, you MUST trigger a new deployment!**

Vite bundles environment variables at build time, so just updating them in Netlify's settings won't update your live site.

**To trigger a redeploy:**
1. Go to Netlify Dashboard → Your Site → Deploys
2. Click "Trigger deploy" → "Deploy site"

### Getting Your Railway Backend URL

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your backend project
3. Copy the domain from Settings → Domains
4. Use format: `https://your-project.railway.app/api`

### Troubleshooting

**Issue: "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT" or "localhost:8000"**
- **Cause**: `VITE_API_URL` is still set to localhost
- **Fix**: Update Netlify environment variable to your Railway URL and redeploy

**Issue: CORS errors**
- **Cause**: Backend not configured to allow your Netlify domain
- **Fix**: Update Railway backend environment variables:
  - `CORS_ALLOWED_ORIGINS` should include your Netlify URL
  - `ALLOWED_HOSTS` should include your Railway domain

**Issue: 404 on API calls**
- **Cause**: Incorrect API URL format
- **Fix**: Ensure `VITE_API_URL` ends with `/api`

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   ├── auth/       # Authentication components
│   │   ├── layout/     # Layout components (Sidebar, etc.)
│   │   ├── students/   # Student management components
│   │   ├── academics/  # Academic components
│   │   └── payments/   # Payment components
│   ├── pages/          # Page components
│   ├── context/        # React Context providers
│   ├── services/       # API service layer
│   └── utils/          # Utility functions
├── public/             # Static assets
└── dist/              # Production build output
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Technologies Used

- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide Icons

## Environment Variables

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `VITE_API_URL` | Backend API endpoint | `http://localhost:8000/api` | `https://your-railway-url.railway.app/api` |

See [NETLIFY_DEPLOYMENT_GUIDE.md](../NETLIFY_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.
