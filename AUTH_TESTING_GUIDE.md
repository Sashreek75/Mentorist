# Mentorist Auth Testing Guide

## Clean Slate ✓
- ✅ All user profiles cleared from mentorist_profiles table
- ✅ All questions cleared from mentorist_questions table  
- ✅ All alerts cleared from mentorist_alerts table
- ⚠️ **Manual step**: Delete all auth users from Supabase Dashboard
  - Go to: Supabase → Authentication → Users
  - Delete all test users manually (API doesn't support this)

## Email Signup Flow

### Prerequisites
- Clear browser localStorage: DevTools → Application → Local Storage → Clear All
- Clear browser cookies for the domain

### Test Case: Student Email Signup
1. Navigate to `/auth.html`
2. Ensure "Student" role card is selected
3. Enter: 
   - Full Name: "Jane Student"
   - Email: "jane@example.com"
   - Password: "TestPassword123"
4. Click "Create Account"
5. **Expected Results:**
   - ✓ Toast: "Account created! Completing setup..."
   - ✓ Redirects to `/onboarding.html`
   - ✓ Console shows: `[AUTH] Sign-in event for jane@example.com`
   - ✓ Check network: POST to `/auth/v1/signup`
   - ✓ Check Supabase: User appears in mentorist_profiles table

### Test Case: Mentor Email Signup
1. Navigate to `/auth.html`
2. Click "Mentor" role card
3. Enter:
   - Full Name: "John Mentor"
   - Email: "john@example.com"
   - Password: "TestPassword123"
4. Click "Create Account"
5. **Expected Results:**
   - ✓ Toast: "Account created! Completing setup..."
   - ✓ Redirects to `/mentorapplication.html` (mentors need application)
   - ✓ Console shows mentor-specific logs

### Test Case: Admin Email Signup
1. Navigate to `/auth.html`
2. Create account with email: `admin.test@mentorist.org`
3. Full Name: "Admin Test"
4. Password: "TestPassword123"
5. **Expected Results:**
   - ✓ Detects @mentorist.org domain
   - ✓ Sets role to 'admin'
   - ✓ Redirects directly to `/admin.html`
   - ✓ Able to see admin dashboard

### Test Case: Duplicate Email
1. Signup as jane@example.com (as above)
2. Attempt to signup again with same email
3. **Expected Results:**
   - ✓ Toast: "This email is already registered. Please sign in instead."
   - ✓ Auto-switches to login view

## Email Login Flow

### Test Case: Successful Login
1. Navigate to `/auth.html?mode=login`
2. Enter email: "jane@example.com"
3. Enter password: "TestPassword123"
4. Click "Sign in to Dashboard"
5. **Expected Results:**
   - ✓ Toast: "Welcome back to Mentorist!"
   - ✓ Redirects to `/studentdashboard.html` (or `/onboarding.html` if not onboarded)
   - ✓ User data loaded in dashboard

### Test Case: Invalid Credentials
1. Try login with:
   - Email: "jane@example.com"
   - Password: "WrongPassword"
2. **Expected Results:**
   - ✓ Toast: "Invalid email or password. Please try again."
   - ✓ Stays on login form
   - ✓ Console shows error details

### Test Case: Non-existent Email
1. Try login with:
   - Email: "nonexistent@example.com"
   - Password: "AnyPassword123"
2. **Expected Results:**
   - ✓ Toast: "Invalid email or password. Please try again." (generic for security)
   - ✓ Stays on login form

## Google OAuth Signup Flow

### Prerequisites
- Google OAuth must be configured in Supabase
- Your domain must be whitelisted as redirect URI

### Test Case: Student Google Signup
1. Navigate to `/auth.html`
2. Ensure "Student" role selected
3. Click "Continue with Google"
4. **Expected Results:**
   - ✓ Redirects to Google login
   - ✓ Select a Google account
   - ✓ Redirects back to `/auth.html`
   - ✓ Console shows: `[AUTH] Sign-in event for user@gmail.com`
   - ✓ Redirects to `/onboarding.html`
   - ✓ User profile created in mentorist_profiles

### Test Case: Mentor Google Signup
1. Navigate to `/auth.html`
2. Select "Mentor" role
3. Click "Continue with Google"
4. **Expected Results:**
   - ✓ Redirects to Google login
   - ✓ Returns to `/auth.html`
   - ✓ Detects mentor role from sessionStorage
   - ✓ Redirects to `/mentor-review.html`

## Google OAuth Login Flow

### Test Case: Login with Google Account
1. Logout first (click logout button on dashboard)
2. Navigate to `/auth.html?mode=login`
3. Click "Sign in with Google"
4. **Expected Results:**
   - ✓ Redirects to Google login
   - ✓ Returns to `/auth.html`
   - ✓ Routes to appropriate dashboard based on user role

## Common Issues & Fixes

### Issue: "SIGNED_IN event doesn't trigger"
**Debug:**
- Check browser console for `[AUTH] Sign-in event` logs
- Verify Supabase session token is saved: 
  - DevTools → Application → Storage → `sb-[PROJECT-ID]-auth-token`
- Check Network tab for auth API responses

**Fix:**
- Verify Supabase URL and key in `shared.js`
- Check browser privacy settings aren't blocking cookies
- Try incognito/private mode

### Issue: "User redirects to wrong page"
**Debug:**
- Console should show `[ROUTE]` logs explaining routing decision
- Check user role: `Auth.getUser()` in console
- Check onboarded status: `Auth.getUser().onboarded`

**Fix:**
- Verify user role is correct in mentorist_profiles
- Check onboarded flag for students
- Verify mentor application status

### Issue: "User profile not created in database"
**Debug:**
- Check mentorist_profiles table for user email
- Check console for `[AUTH] User profile persisted to database` log
- Verify UserStore.persistRemote() completed

**Fix:**
- Check RLS policies aren't blocking inserts
- Verify email column is lowercase in database
- Try manual upsert via Supabase dashboard

### Issue: "Google OAuth fails"
**Debug:**
- Check console for `[GOOGLE]` logs
- Verify redirect URL matches Supabase config
- Check Network tab for 400/401 errors

**Fix:**
- Verify Google Client ID is set correctly
- Confirm redirect URI in Supabase matches deployment
- Check browser console security warnings

## Debugging Commands

Run these in browser console while on auth pages:

```javascript
// Check current user
Auth.getUser()

// Check all stored users
JSON.parse(localStorage.getItem('mn_all_users'))

// Check Supabase session
supabaseClient.auth.getSession()

// Check current auth state
supabaseClient.auth.getUser()

// Manually check remote users
UserStore.refreshFromRemote()

// Clear and reload
localStorage.clear(); location.reload()

// View auth-related logs (in production, check server logs)
console.log('Recent auth events'); // check browser logs
```

## Success Criteria ✓

All of the following should work:
- ✅ Email signup (student, mentor, admin)
- ✅ Email login
- ✅ Google signup (student, mentor)
- ✅ Google login
- ✅ Proper routing after auth based on role
- ✅ User profiles created in Supabase
- ✅ Onboarding flow works for students
- ✅ Mentor application flow works
- ✅ Admin dashboard accessible
- ✅ Logout and re-login works
- ✅ Duplicate emails rejected
- ✅ Invalid credentials rejected
- ✅ Sessions persist across page reloads
