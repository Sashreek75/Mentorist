# Mentorist - Complete Reset & Fix Guide

## Overview
This guide explains how to completely reset the Mentorist database and verify auth/admin functionality.

## Files Modified/Created

### 1. **wipe-clean.js** (NEW)
A complete data wipe script that deletes:
- All Supabase Auth users
- All user profiles (mentorist_profiles)
- All questions (mentorist_questions)
- All alerts (mentorist_alerts)
- All mentor applications (mentorist_mentors)

**Usage:**
```bash
node wipe-clean.js
```

Then type `WIPE ALL DATA` when prompted to confirm.

### 2. **admin.html** (FIXED)
**Fix Applied:** Admin stats now correctly exclude suspended/banned users

**What Changed:**
- Updated `renderStats()` function to filter users by active status
- Only counts users with status in: `['active', 'pending', 'onboarded']`
- Excludes suspended, banned, rejected, and archived accounts

**Stats Now Display:**
- ✅ **Total Students** - Only active students (excludes suspended/banned)
- ✅ **Total Mentors** - Only active mentors (excludes suspended/banned)
- ✅ **Active Guidance** - Mentors with status='active'
- ✅ **Mentor Reviews** - Pending mentor applications
- ✅ **Rejected Mentors** - Mentors rejected during review
- ✅ **Inquiries Sent** - Total questions asked
- ✅ **Strategic Responses** - Questions with answers
- ✅ **Total Broadcasts** - Global alerts created

## How to Reset & Test

### Step 1: Complete Database Wipe
```bash
cd c:\Users\sashr\Desktop\Nonprofit
node wipe-clean.js
```

Follow the prompts and type `WIPE ALL DATA` when prompted.

### Step 2: Test Fresh Signup

1. Open http://localhost:8000/index.html
2. Click "Join Free"
3. Sign up with:
   - **Name:** Test Student
   - **Email:** student@example.com
   - **Password:** TestPass123
   - **Role:** Student

4. Complete 6-step onboarding:
   - Step 1: Select grade (e.g., "High School")
   - Step 2: Select interest (e.g., "STEM Track")
   - Step 3: Select rigor (e.g., "Rigorous")
   - Step 4: Enter goal (e.g., "I want to become a software engineer")
   - Step 5: Enter career aspirations and skills
   - Step 6: Review profile summary

5. You should be taken to recommendations.html showing personalized recommendations

### Step 3: Test Admin Access

1. Sign up another account with email: `admin@mentorist.org`
   - This automatically gets admin role
   
2. You'll be routed to admin.html

3. Verify stats are accurate:
   - Total Students = 1 (the student account)
   - Total Mentors = 0 (or more if you created mentor accounts)
   - All other stats should be accurate

### Step 4: Test Mentor Signup

1. Sign up as mentor with:
   - **Email:** mentor@example.com
   - **Role:** Mentor

2. Complete mentor application form (mentorapplication.html)

3. Go to admin account and approve the mentor

4. Verify in admin stats:
   - Total Mentors count increased
   - Active Guidance shows the approved mentor

### Step 5: Test Suspension

1. From admin dashboard, suspend the student account

2. Verify stats updated:
   - Total Students decreased by 1
   - Suspended account no longer counted

3. Try to login with suspended account:
   - You should see 5-minute cooldown message

## Key Fixes Explained

### Admin Stats Accuracy
**Before:**
```javascript
const studentCount = users.filter(u => u.role === 'student').length;
// This counted ALL students, including suspended ones!
```

**After:**
```javascript
const activeStatuses = new Set(['active', 'pending', 'onboarded']);
const studentCount = users.filter(u => u.role === 'student' && activeStatuses.has(u.status)).length;
// Now only counts ACTIVE students
```

### Why This Matters
- Suspended/banned users should not count toward active user counts
- Admin needs accurate metrics for platform health monitoring
- Stats should reflect "active" platform usage, not historical data

## Auth Flow Verification

When logging in, verify the flow:

1. **Supabase Auth** → Signs in user, triggers `onAuthStateChange` event
2. **Role Detection** → Checks email pattern or stored role
3. **Status Check** → Verifies user is not suspended/banned
4. **Routing** → Sends to appropriate dashboard
   - Admins → admin.html
   - Active Mentors → mentordashboard.html
   - Active Students → recommendations.html (if onboarded) or onboarding.html (if new)
   - Suspended users → Auth page with cooldown message

## Troubleshooting

### Issue: Auth loops back to login
**Solution:** Check localStorage for 'mn_user' key, ensure Supabase session is valid

### Issue: Stats don't update after actions
**Solution:** 
- Click "Refresh Accounts" button in admin dashboard
- Check browser console for errors
- Verify user status in mentorist_profiles table

### Issue: Suspended user can login again immediately
**Solution:** Ensure suspension cooldown timer is working
- Check localStorage for `mn_suspended_<email>` key
- Should persist for 5 minutes (300,000ms)

## Database Schema Verification

Verify these tables exist in Supabase:
1. `mentorist_profiles` - User accounts
2. `mentorist_questions` - Student inquiries
3. `mentorist_alerts` - Global broadcasts
4. `mentorist_mentors` - Mentor applications
5. `auth.users` - Supabase auth users

Each user should have these fields:
- `email` (unique)
- `role` (admin|mentor|student)
- `status` (active|pending|suspended|banned|rejected)
- `name`
- `profile` (JSON)
- `onboarded` (boolean)

## Next Steps

1. Run complete wipe with `node wipe-clean.js`
2. Test fresh signup flow
3. Verify admin stats are accurate
4. Test mentor approval workflow
5. Test suspension and account recovery
6. Commit fixes to git with message: "Fix: Accurate admin stats and auth flow improvements"

---
**Last Updated:** May 31, 2026
**Status:** Ready for testing
