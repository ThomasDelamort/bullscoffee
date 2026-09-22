Backend Updates

1. Dependencies (package.json)
   - Add @clerk/express for backend authentication
2. Middleware (in server.ts)
   - Add Clerk authentication middleware to validate tokens
   - Configure CORS to allow your frontend origin
   - Add middleware to attach user info to requests
3. Database Schema (init.sql)
   - Add user/auth table if you want to sync Clerk users to your DB
   - Link existing tables (employees, customers, suppliers) to users via clerk_user_id or similar
4. Controllers & Routes
   - Update all route handlers to check for authenticated users
   - Pass userId from Clerk to your business logic
   - Add permission checks (e.g., users can only see/modify
5. Environment Variables (.env)
   - Add CLERK_SECRET_KEY
   - Add CLERK_PUBLISHABLE_KEY (optional for backend reference)

Frontend Updates

1. Dependencies (package.json)
   - Add @clerk/react for React integration
2. App Root (App.tsx or main entry)
   - Wrap app with <ClerkProvider>
   - Set up publishableKey from environment
3. Routes/Pages
   - Add <SignedIn> / <SignedOut> components for conditional rendering
   - Add <RedirectToSignIn> for login redirect
   - Optionally add <UserButton> for user profile menu
4. API Calls
   - Update all fetch calls to include auth token
   - Handle 401 responses for expired sessions
5. Environment Variables (.env.local)
   - Add VITE_CLERK_PUBLISHABLE_KEY

Summary of Key Changes

- Authentication layer: Protect your API endpoints
- User identity: Link your business data to Clerk user IDs
- Session management: Handle token validation and refresh
- UI guards: Show/hide content based on auth status
