# Quick Visual Testing Guide

## 🚀 Quick Start (5 Minutes)

### What You Need
- ✅ Admin account logged in
- ✅ Browser console open (F12)
- ✅ At least 1 pending check-in request
- ✅ At least 1 pending check-out request

---

## 📝 Test 1: Check-In Approval (2 minutes)

### Steps:
1. Go to `/admin/reception`
2. Click **PENDING** tab
3. Find a check-in request (Action tag: `CHECK-IN`)
4. Click **REVIEW**
5. Click **Approve Arrival**

### ✅ What You Should See:

**Console Output:**
```
🔄 [ADMIN] ✅ CHECK-IN APPROVAL DETECTED
🔄 [ADMIN] Setting filter to: check_in (CHECK IN tab)
🔄 [ADMIN] ⚠️ NOTE: Reception will complete check-in → status becomes 'guests' (ACTIVE tab)
```

**UI Behavior:**
- Tab automatically switches to **CHECK IN** tab ✅
- Request appears in CHECK IN tab ✅
- Request NOT in ACTIVE tab yet ✅

**Next Step:**
- Reception clicks "Check In" → Request moves to **ACTIVE** tab

---

## 📝 Test 2: Check-Out Approval (2 minutes)

### Steps:
1. Go to `/admin/reception`
2. Click **PENDING** tab
3. Find a check-out request (Action tag: `CHECK-OUT`)
4. Click **REVIEW**
5. Click **Approve Departure**

### ✅ What You Should See:

**Console Output:**
```
🔄 [ADMIN] ✅ CHECK-OUT APPROVAL DETECTED
🔄 [ADMIN] Setting filter to: check_out (CHECK OUT tab)
🔄 [ADMIN] ⚠️ CONFIRMATION: This request will appear in CHECK OUT tab, NOT CHECK IN tab
```

**UI Behavior:**
- Tab automatically switches to **CHECK OUT** tab ✅
- Request appears in CHECK OUT tab ✅
- **Request NOT in CHECK IN tab** ✅ (MOST IMPORTANT!)

**Also Check:**
- Room is released (status: available) ✅

---

## ❌ Test 3: Validation Check (1 minute)

### What to Test:
Try to approve a check-out request as check-in (should fail)

### How:
1. Find a check-out request in PENDING tab
2. In browser console, run:
```javascript
fetch('/api/reception-requests/REQUEST_ID', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ status: 'check_in' })
}).then(r => r.json()).then(console.log)
```

### ✅ What You Should See:

**Response:**
```json
{
  "message": "ERROR: Check-out requests cannot be set to check_in status. Use check_out status instead.",
  "errorCode": "INVALID_STATUS_TRANSITION"
}
```

**Console Output:**
```
❌ [API] CRITICAL VALIDATION ERROR
❌ [API] Attempting to set check_out request to check_in status!
```

---

## ✅ Quick Verification Checklist

After both approvals, verify:

| Check | Expected Result | Pass? |
|-------|----------------|-------|
| Check-in request in CHECK IN tab | ✅ Yes | ☐ |
| Check-out request in CHECK OUT tab | ✅ Yes | ☐ |
| Check-out NOT in CHECK IN tab | ✅ Not there | ☐ |
| Check-in NOT in CHECK OUT tab | ✅ Not there | ☐ |
| Console shows correct logs | ✅ Clear logs | ☐ |
| No error messages | ✅ Clean | ☐ |
| Tab counts are accurate | ✅ Correct | ☐ |

---

## 🎯 Critical Test: No Tab Mixing

### The Most Important Test!

1. Approve a **check-out** request
2. Immediately check: **Does it appear in CHECK IN tab?**

**Expected:** ❌ NO - It should ONLY be in CHECK OUT tab

**If YES:** 🚨 BUG - The fix is not working!

---

## 📊 Tab Layout Reference

```
┌────────────────────────────────────────────────────────┐
│  [ALL] [PENDING] [CHECK IN] [ACTIVE] [DENIED] [CHECK OUT] │
└────────────────────────────────────────────────────────┘

PENDING    → Awaiting admin approval
CHECK IN   → Admin approved, reception needs to complete
ACTIVE     → Guest currently staying (reception completed)
DENIED     → Rejected by admin
CHECK OUT  → Admin approved check-out, room being released
```

---

## 🔍 What to Look For in Console

### ✅ Good Signs:
- `✅ CHECK-IN APPROVAL DETECTED`
- `✅ CHECK-OUT APPROVAL DETECTED`
- `✅ Status validation passed`
- `✅ REQUEST UPDATED SUCCESSFULLY`
- `🔑 ROOM RELEASE OPERATION`

### ❌ Bad Signs:
- `❌ CRITICAL VALIDATION ERROR`
- `❌ APPROVAL FAILED`
- `❌ NETWORK ERROR`
- `❌ POST-UPDATE VALIDATION ERROR`

---

## 🐛 Common Issues & Fixes

### Issue: Request appears in wrong tab
**Fix:** 
1. Hard refresh (Ctrl+Shift+R)
2. Check console for errors
3. Verify status in database

### Issue: Approval fails
**Fix:**
1. Check console error message
2. Verify token is valid
3. Check request exists

### Issue: Tab counts wrong
**Fix:**
1. Click refresh button (↻)
2. Wait 30 seconds for auto-refresh
3. Check API response

---

## 📸 Screenshot Checklist

Take screenshots of:
1. ✅ CHECK IN tab with check-in requests
2. ✅ CHECK OUT tab with check-out requests
3. ✅ Console logs showing successful approvals
4. ✅ Tab counts matching expected values

---

## ⏱️ Time Estimates

| Test | Time |
|------|------|
| Check-In Approval | 2 min |
| Check-Out Approval | 2 min |
| Validation Check | 1 min |
| Tab Verification | 1 min |
| **Total** | **6 min** |

---

## 🎓 Pro Tips

1. **Keep console open** - Watch logs in real-time
2. **Clear console** before each test (Ctrl+L)
3. **Use Network tab** - See API responses
4. **Test both flows** - Don't skip either one
5. **Verify no mixing** - Most critical test!

---

## ✅ Success Criteria

You know it's working when:
- ✅ Check-in goes to CHECK IN tab
- ✅ Check-out goes to CHECK OUT tab
- ✅ NO mixing between tabs
- ✅ Console shows clean logs
- ✅ No errors appear
- ✅ Tab counts are correct

---

## 🆘 Need Help?

If tests fail:
1. Copy console logs
2. Take screenshots
3. Note the exact steps
4. Check [TESTING_APPROVAL_FLOWS.md](./TESTING_APPROVAL_FLOWS.md) for detailed troubleshooting
