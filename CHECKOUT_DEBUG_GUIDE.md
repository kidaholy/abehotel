# Check-Out Status Debug Guide

## How to Debug the Check-Out Flow

### Step 1: Open Browser Console
1. Open the admin reception page
2. Press `F12` to open Developer Tools
3. Go to the "Console" tab
4. Keep the console open while testing

### Step 2: Test the Check-Out Flow

**When Reception Staff Requests Check-Out:**
- Look for logs starting with `[ADMIN]`
- You should see:
  ```
  📤 [ADMIN] Approving request {id} with status: check_out
  ✅ [ADMIN] Approval successful, response: {...}
  🔄 [ADMIN] Setting filter to: check_out
  🔄 [ADMIN] Filter state updated to: check_out
  ```

**When Admin Approves:**
- You should see:
  ```
  📡 [ADMIN] Fetching requests with URL: /api/reception-requests?limit=100&status=check_out
  📡 [ADMIN] Received X requests, total: Y
  ```

### Step 3: What Each Log Means

| Log | Meaning |
|-----|---------|
| `📤 [ADMIN] Approving request...` | Admin clicked approve button |
| `✅ [ADMIN] Approval successful...` | API returned success |
| `🔄 [ADMIN] Setting filter to: check_out` | Filter is being changed |
| `🔄 [ADMIN] Filter state updated to: check_out` | Filter state has been updated |
| `📡 [ADMIN] Fetching requests with URL...` | API is being called with the new filter |
| `📡 [ADMIN] Received X requests...` | Data has been fetched |

### Step 4: Troubleshooting

**If you see "Approval successful" but no fetch logs:**
- The filter change might not be triggering the useEffect
- Check if the filter state is actually changing
- Look for any errors in the console

**If you see fetch logs but wrong status:**
- Check the URL being called
- Make sure `status=check_out` is in the URL
- If not, the filter didn't change properly

**If you see "Received 0 requests":**
- The API is returning no results
- Check if the request was actually saved with status=check_out
- Check the database directly

### Step 5: Expected Flow

```
1. Reception staff clicks "Check Out" on active guest
   ↓
2. Request sent: { status: "pending", inquiryType: "check_out" }
   ↓
3. Admin sees pending request with "CHECK-OUT" tag
   ↓
4. Admin clicks "Approve Departure"
   ↓
5. Console shows: "📤 [ADMIN] Approving request... with status: check_out"
   ↓
6. Console shows: "✅ [ADMIN] Approval successful"
   ↓
7. Console shows: "🔄 [ADMIN] Setting filter to: check_out"
   ↓
8. Console shows: "📡 [ADMIN] Fetching requests with URL: ...&status=check_out"
   ↓
9. Console shows: "📡 [ADMIN] Received X requests"
   ↓
10. Page switches to "CHECK OUT" tab
    ↓
11. Approved request appears in CHECK OUT tab ✅
```

### Step 6: Database Check

If the flow isn't working, check the database directly:

```javascript
// In MongoDB console
db.receptionrequests.findOne({ guestName: "John Doe" })

// Should show:
{
  _id: ObjectId(...),
  guestName: "John Doe",
  status: "check_out",        // ← Should be "check_out"
  inquiryType: "check_out",   // ← Should be "check_out"
  roomNumber: "101",
  reviewedBy: ObjectId(...),  // ← Should have admin ID
  ...
}
```

### Step 7: Common Issues

**Issue: Status shows "pending" instead of "check_out"**
- The approval didn't go through
- Check if admin is actually clicking the approve button
- Check if there are any errors in the console

**Issue: Request disappears after approval**
- The filter changed but no data is showing
- Check if the API is returning empty results
- Verify the request was saved with the correct status

**Issue: Request shows in wrong tab**
- The filter didn't change
- Check the console logs for filter change messages
- If no logs, the setFilter call didn't work

### Step 8: Manual Test

1. Open console
2. Manually change filter:
   ```javascript
   // In console, type:
   setFilter("check_out")
   ```
3. Watch for fetch logs
4. If you see fetch logs, the filter change works
5. If no logs, there's an issue with the filter state

## Key Files to Check

- `app/admin/reception/page.tsx` - Main admin page
- `app/api/reception-requests/[id]/route.ts` - Approval endpoint
- `app/api/reception-requests/route.ts` - Fetch endpoint
- `lib/models/reception-request.ts` - Database model

## Console Logs Added

All logs are prefixed with `[ADMIN]` for easy filtering:
- `📤` = Action being sent
- `✅` = Success
- `🔄` = State change
- `📡` = API call
- `❌` = Error

Filter console by typing: `[ADMIN]`
