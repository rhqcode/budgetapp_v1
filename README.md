# BudgetApp frontend

Public Vite frontend for BudgetApp. It is designed for GitHub Pages and talks only to the private Express API. Firebase authentication and data APIs are never called by frontend JavaScript.

## Local development

Requirements: Node.js 20 or newer.

1. Copy `.env.example` to `.env.local` and fill in the local API URL.
2. Run the backend on port 3000.
3. Run `npm install` and `npm run dev`.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys `main`.

In GitHub:

1. Keep this repository public and set **Settings > Pages > Source** to **GitHub Actions**.
2. Add `VITE_API_URL` as a repository **Variable** under **Settings > Secrets and variables > Actions**. Set it to the Render service URL, with no trailing slash.

The workflow currently uses `/budgetapp_v1/` as the Pages base path. Change `VITE_BASE_PATH` in the workflow if the repository name changes.

## Architecture

- The frontend redirects users to the backend `/auth/google` endpoint.
- The backend completes Google OAuth and exchanges the Google identity with Firebase Authentication.
- The backend creates a Firebase session cookie marked HTTP-only, so frontend JavaScript cannot read it.
- API calls include that cookie and the backend verifies it with Firebase Admin.
- Firestore data is stored at `users/{uid}/app/data` and is only accessed by the API.

For reliable production cookies, use custom domains on the same parent domain (for example `app.example.com` and `api.example.com`). A GitHub Pages domain calling a Render domain requires `SameSite=None; Secure`, and browsers that block third-party cookies may still reject that cross-site session.

The backend lives separately at `../budgetapp_v1_backend` and should be pushed to a private GitHub repository.
