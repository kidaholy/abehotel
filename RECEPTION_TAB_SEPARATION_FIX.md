# Reception Request Tab Separation Fix

## Overview
This fix ensures that reception requests are properly separated into distinct tabs based on their status and type:
- **CHECK IN** tab: Shows approved check-in requests waiting for reception to complete
- **ACTIVE** tab: Shows guests who are currently staying (completed check-in)
- **CHECK OUT** tab: Shows approved check-out requests
- **PENDING** tab: Shows requests waiting for admin approval
- **DENIED** tab: Shows rejected requests

**Critical Rule:** Check-out requests NEVER appear in the CHECK IN tab. When a check-out request is approved, it goes directly to the CHECK OUT tab.

---

## Problem Statement
Previously, there was confusion with status naming and tab organization:
1. The "APPROVED" tab label didn't clearly indicate it was for check-in requests
2. Check-out requests could potentially appear in the wrong tab
3. The `guests` status (active guests) wasn't properly separated from `check_in` status (approved but not yet completed)
4. Reception staff completes the check-in process, changing status from `check_in` to `guests`

The system needed multiple validation layers to prevent any mixing of request types between tabs and clear naming conventions.

---

## Solution Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION (Admin)                       │
│         Click "Approve" on a Reception Request               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 1: FRONTEND VALIDATION                    │
│  File: app/admin/reception/page.tsx                          │
│                                                              │
│  ✓ Check inquiryType of the request                          │
│  ✓ If inquiryType === "check_out" AND status === "check_in"  │
│    → BLOCK: Show error notification                          │
│  ✓ If inquiryType === "check_in" AND status === "check_out"  │
│    → BLOCK: Show error notification                          │
│  ✓ Log detailed operation info to console                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (if validation passes)
┌─────────────────────────────────────────────────────────────┐
│              LAYER 2: API CALL                               │
│  PUT /api/reception-requests/[id]                            │
│  Body: { status, reviewNote }                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          LAYER 3: BACKEND VALIDATION                         │
│  File: app/api/reception-requests/[id]/route.ts              │
│                                                              │
│  ✓ Fetch current request from database                       │
│  ✓ Verify inquiryType matches requested status               │
│  ✓ If mismatch → Return 400 error with details               │
│  ✓ Log validation details to console                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (if validation passes)
┌─────────────────────────────────────────────────────────────┐
│              LAYER 4: DATABASE UPDATE                        │
│                                                              │
│  ✓ Update request status                                     │
│  ✓ Set reviewNote and reviewedBy                             │
│  ✓ If check_out approved → Release room                      │
│  ✓ Log final status and details                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         LAYER 5: POST-UPDATE VALIDATION                      │
│                                                              │
│  ✓ Verify updated status matches inquiryType                 │
│  ✓ If check_out request has status != check_out              │
│    → Log ERROR: Database inconsistency detected              │
│  ✓ If check_in request has status != check_in                │
│    → Log ERROR: Database inconsistency detected              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         LAYER 6: FRONTEND TAB ROUTING                        │
│  File: app/admin/reception/page.tsx                          │
│                                                              │
│  ✓ Based on status set:                                      │
│    - status === "check_out" → Set filter to "check_out"      │
│    - status === "check_in"  → Set filter to "check_in"       │
│    - status === "guests"    → Set filter to "guests"         │
│    - status === "rejected" → Set filter to "rejected"        │
│  ✓ Fetch requests with new filter                            │
│  ✓ UI automatically switches to correct tab                  │
│                                                              │
│  Tab Labels:                                                 │
│    - check_in  → "CHECK IN" (approved, awaiting reception)   │
│    - guests    → "ACTIVE" (guest currently staying)          │
│    - check_out → "CHECK OUT" (approved departure)            │
│    - pending   → "PENDING" (awaiting admin approval)         │
│    - rejected  → "DENIED" (rejected by admin)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Frontend Modifications (page.tsx)

#### Enhanced `handleAction` Function

**Location:** `app/admin/reception/page.tsx` (lines 97-223)

**Key Changes:**

1. **Request Lookup & Validation:**
   ```typescript
   const request = requests.find(r => r._id === id)
   if (!request) {
     console.error(`❌ [ADMIN] Request not found in local state: ${id}`)
     notify({ title: "Error", message: "Request not found", type: "error" })
     return
   }
   ```

2. **Frontend Validation Layer:**
   ```typescript
   // Prevent check_out requests from being approved as check_in
   if (request.inquiryType === "check_out" && status === "check_in") {
     console.error(`❌ [ADMIN] CRITICAL VALIDATION ERROR`)
     notify({ 
       title: "Validation Error", 
       message: "Cannot approve check-out request as check-in", 
       type: "error" 
     })
     setActioning(false)
     return
   }
   
   // Prevent check_in requests from being approved as check_out
   if (request.inquiryType === "check_in" && status === "check_out") {
     console.error(`❌ [ADMIN] CRITICAL VALIDATION ERROR`)
     notify({ 
       title: "Validation Error", 
       message: "Cannot approve check-in request as check-out", 
       type: "error" 
     })
     setActioning(false)
     return
   }
   ```

3. **Intelligent Tab Routing:**
   ```typescript
   let newFilter: keyof typeof FILTER_LABELS = "all"
   
   if (status === "check_out") {
     newFilter = "check_out"  // CHECK OUT tab
     console.log(`🔄 [ADMIN] ✅ CHECK-OUT APPROVAL DETECTED`)
     console.log(`🔄 [ADMIN] Setting filter to: check_out (CHECK OUT tab)`)
   } else if (status === "check_in") {
     newFilter = "check_in"   // CHECK IN tab
     console.log(`🔄 [ADMIN] ✅ CHECK-IN APPROVAL DETECTED`)
     console.log(`🔄 [ADMIN] Setting filter to: check_in (CHECK IN tab)`)
     console.log(`🔄 [ADMIN] ⚠️ NOTE: Reception will complete check-in → status becomes 'guests' (ACTIVE tab)`)
   } else if (status === "rejected") {
     newFilter = "rejected"   // DENIED tab
     console.log(`🔄 [ADMIN] ✅ REJECTION DETECTED`)
     console.log(`🔄 [ADMIN] Setting filter to: rejected (DENIED tab)`)
   }
   
   setFilter(newFilter)
   setTimeout(() => fetchRequests(newFilter), 300)
   ```

4. **Enhanced Logging:**
   - All operations wrapped in visible separators
   - Clear distinction between CHECK-IN and CHECK-OUT approvals
   - Detailed request information logged (ID, guest name, inquiry type, status)

---

### 2. Backend Validation (route.ts)

#### Enhanced `PUT` Handler

**Location:** `app/api/reception-requests/[id]/route.ts` (lines 8-103)

**Key Changes:**

1. **Request Details Logging:**
   ```typescript
   console.log(`📥 [API] RECEPTION REQUEST UPDATE RECEIVED`)
   console.log(`📥 [API] Request ID: ${params.id}`)
   console.log(`📥 [API] Requested Status: ${status}`)
   console.log(`📥 [API] User Role: ${decoded.role}`)
   
   console.log(`📋 [API] Current Request Details:`)
   console.log(`📋 [API] - Guest: ${currentRequest.guestName}`)
   console.log(`📋 [API] - Inquiry Type: ${currentRequest.inquiryType}`)
   console.log(`📋 [API] - Current Status: ${currentRequest.status}`)
   ```

2. **Backend Validation Layer:**
   ```typescript
   // Block check_out → check_in transition
   if (currentRequest.inquiryType === "check_out" && status === "check_in") {
     console.error(`❌ [API] CRITICAL VALIDATION ERROR`)
     console.error(`❌ [API] Attempting to set check_out request to check_in status!`)
     return NextResponse.json({ 
       message: "ERROR: Check-out requests cannot be set to check_in status",
       errorCode: "INVALID_STATUS_TRANSITION"
     }, { status: 400 })
   }
   
   // Block check_in → check_out transition
   if (currentRequest.inquiryType === "check_in" && status === "check_out") {
     console.error(`❌ [API] CRITICAL VALIDATION ERROR`)
     console.error(`❌ [API] Attempting to set check_in request to check_out status!`)
     return NextResponse.json({ 
       message: "ERROR: Check-in requests cannot be set to check_out status",
       errorCode: "INVALID_STATUS_TRANSITION"
     }, { status: 400 })
   }
   ```

3. **Post-Update Validation:**
   ```typescript
   // Verify status matches inquiryType after update
   if (updated.inquiryType === "check_out" && 
       updated.status !== "check_out" && 
       updated.status !== "pending" && 
       updated.status !== "rejected") {
     console.error(`❌ [API] POST-UPDATE VALIDATION ERROR`)
     console.error(`❌ [API] Check-out request has invalid status: ${updated.status}`)
   }
   
   if (updated.inquiryType === "check_in" && 
       updated.status !== "check_in" && 
       updated.status !== "pending" && 
       updated.status !== "rejected") {
     console.error(`❌ [API] POST-UPDATE VALIDATION ERROR`)
     console.error(`❌ [API] Check-in request has invalid status: ${updated.status}`)
   }
   ```

4. **Room Release Logging:**
   ```typescript
   if (status === "check_out" && updated.roomNumber) {
     console.log(`🔑 [API] ROOM RELEASE OPERATION`)
     console.log(`🔑 [API] Releasing room ${updated.roomNumber}`)
     console.log(`🔑 [API] Guest: ${updated.guestName}`)
   }
   ```

---

## Console Output Examples

### Scenario 1: Check-In Approval (Success)

```
📤 [ADMIN] =========================================
📤 [ADMIN] APPROVAL OPERATION STARTED
📤 [ADMIN] Request ID: 67a1b2c3d4e5f6g7h8i9j0k1
📤 [ADMIN] Guest Name: John Doe
📤 [ADMIN] Inquiry Type: check_in
📤 [ADMIN] Current Status: pending
📤 [ADMIN] Requested Status: check_in
📤 [ADMIN] Status type: CHECK-IN
📤 [ADMIN] =========================================
✅ [ADMIN] Frontend validation passed: inquiryType=check_in, status=check_in

📥 [API] =========================================
📥 [API] RECEPTION REQUEST UPDATE RECEIVED
📥 [API] Request ID: 67a1b2c3d4e5f6g7h8i9j0k1
📥 [API] Requested Status: check_in
📥 [API] User Role: admin
📥 [API] =========================================
📋 [API] Current Request Details:
📋 [API] - Guest: John Doe
📋 [API] - Inquiry Type: check_in
📋 [API] - Current Status: pending
📋 [API] - Room: 101
✅ [API] Status validation passed
✅ [API] Inquiry Type: check_in
✅ [API] Requested Status: check_in
✅ [API] Transition is VALID

✅ [API] =========================================
✅ [API] REQUEST UPDATED SUCCESSFULLY
✅ [API] Request ID: 67a1b2c3d4e5f6g7h8i9j0k1
✅ [API] Guest: John Doe
✅ [API] Final Status: check_in
✅ [API] Inquiry Type: check_in
✅ [API] =========================================

✅ [ADMIN] =========================================
✅ [ADMIN] APPROVAL SUCCESSFUL
✅ [ADMIN] Request status updated to: check_in
✅ [ADMIN] Confirmed status in response: check_in
✅ [ADMIN] Response inquiryType: check_in
✅ [ADMIN] =========================================

🔄 [ADMIN] ✅ CHECK-IN APPROVAL DETECTED
🔄 [ADMIN] Setting filter to: check_in (CHECK IN tab)
🔄 [ADMIN] ⚠️ NOTE: Reception will complete check-in → status becomes 'guests' (ACTIVE tab)
🔄 [ADMIN] Inquiry Type: check_in
🔄 [ADMIN] Final Status: check_in
🔄 [ADMIN] Changing filter from all to check_in
📡 [ADMIN] Fetching requests with new filter: check_in
```

**Result:** Request appears in **CHECK IN** tab ✓

**Next Step:** Reception staff will click "Check In" button → status changes to `guests` → appears in **ACTIVE** tab

---

### Scenario 2: Check-Out Approval (Success)

```
📤 [ADMIN] =========================================
📤 [ADMIN] APPROVAL OPERATION STARTED
📤 [ADMIN] Request ID: 67a1b2c3d4e5f6g7h8i9j0k2
📤 [ADMIN] Guest Name: Jane Smith
📤 [ADMIN] Inquiry Type: check_out
📤 [ADMIN] Current Status: pending
📤 [ADMIN] Requested Status: check_out
📤 [ADMIN] Status type: CHECK-OUT
📤 [ADMIN] =========================================
✅ [ADMIN] Frontend validation passed: inquiryType=check_out, status=check_out

📥 [API] =========================================
📥 [API] RECEPTION REQUEST UPDATE RECEIVED
📥 [API] Request ID: 67a1b2c3d4e5f6g7h8i9j0k2
📥 [API] Requested Status: check_out
📥 [API] User Role: admin
📥 [API] =========================================
📋 [API] Current Request Details:
📋 [API] - Guest: Jane Smith
📋 [API] - Inquiry Type: check_out
📋 [API] - Current Status: pending
📋 [API] - Room: 205
✅ [API] Status validation passed
✅ [API] Inquiry Type: check_out
✅ [API] Requested Status: check_out
✅ [API] Transition is VALID

✅ [API] =========================================
✅ [API] REQUEST UPDATED SUCCESSFULLY
✅ [API] Request ID: 67a1b2c3d4e5f6g7h8i9j0k2
✅ [API] Guest: Jane Smith
✅ [API] Final Status: check_out
✅ [API] Inquiry Type: check_out
✅ [API] =========================================

🔑 [API] =========================================
🔑 [API] ROOM RELEASE OPERATION
🔑 [API] Releasing room 205
🔑 [API] Guest: Jane Smith
🔑 [API] Status: check_out
🔑 [API] =========================================
✅ [API] Room 205 successfully released to available status

✅ [ADMIN] =========================================
✅ [ADMIN] APPROVAL SUCCESSFUL
✅ [ADMIN] Request status updated to: check_out
✅ [ADMIN] Confirmed status in response: check_out
✅ [ADMIN] Response inquiryType: check_out
✅ [ADMIN] =========================================

🔄 [ADMIN] ✅ CHECK-OUT APPROVAL DETECTED
🔄 [ADMIN] Setting filter to: check_out (CHECK OUT tab)
🔄 [ADMIN] ⚠️ CONFIRMATION: This request will appear in CHECK OUT tab, NOT APPROVED tab
🔄 [ADMIN] Inquiry Type: check_out
🔄 [ADMIN] Final Status: check_out
🔄 [ADMIN] Changing filter from all to check_out
📡 [ADMIN] Fetching requests with new filter: check_out
```

**Result:** Request appears in **CHECK OUT** tab ✓

---

### Scenario 3: Validation Error (Blocked)

```
📤 [ADMIN] =========================================
📤 [ADMIN] APPROVAL OPERATION STARTED
📤 [ADMIN] Request ID: 67a1b2c3d4e5f6g7h8i9j0k3
📤 [ADMIN] Guest Name: Bad Actor
📤 [ADMIN] Inquiry Type: check_out
📤 [ADMIN] Current Status: pending
📤 [ADMIN] Requested Status: check_in
📤 [ADMIN] Status type: CHECK-IN
📤 [ADMIN] =========================================

❌ [ADMIN] CRITICAL VALIDATION ERROR: Check-out request cannot be approved as check-in!
❌ [ADMIN] This is a BUG - please report to development team
```

**Result:** Operation blocked, error notification shown ✓

---

## Testing Procedures

### Test 1: Check-In Request Approval
**Objective:** Verify check-in request goes to CHECK IN tab

1. Create a new check-in request (inquiryType: "check_in", status: "pending")
2. Navigate to Reception Desk → PENDING tab
3. Click "REVIEW" on the check-in request
4. Click "Approve Arrival"
5. **Expected:**
   - Console shows "CHECK-IN APPROVAL DETECTED"
   - Filter changes to "check_in"
   - UI switches to CHECK IN tab
   - Request appears in CHECK IN tab
   - Request does NOT appear in CHECK OUT tab
   - Request does NOT appear in ACTIVE tab
6. **Next:** Reception staff clicks "Check In" button
7. **Expected:**
   - Status changes from `check_in` to `guests`
   - Request moves from CHECK IN tab to ACTIVE tab

### Test 2: Check-Out Request Approval
**Objective:** Verify check-out request goes to CHECK OUT tab

1. Create a new check-out request (inquiryType: "check_out", status: "pending")
2. Navigate to Reception Desk → PENDING tab
3. Click "REVIEW" on the check-out request
4. Click "Approve Departure"
5. **Expected:**
   - Console shows "CHECK-OUT APPROVAL DETECTED"
   - Filter changes to "check_out"
   - UI switches to CHECK OUT tab
   - Request appears in CHECK OUT tab
   - Request does NOT appear in CHECK IN tab
   - Request does NOT appear in ACTIVE tab
   - Room is released (status: "available")

### Test 3: Frontend Validation
**Objective:** Verify frontend blocks invalid status transitions

1. Open browser console
2. Attempt to approve a check_out request with status "check_in"
3. **Expected:**
   - Console shows "CRITICAL VALIDATION ERROR"
   - Error notification displayed
   - Operation blocked before API call

### Test 4: Backend Validation
**Objective:** Verify backend blocks invalid status transitions

1. Use API client (Postman/Thunder Client)
2. Send PUT request to `/api/reception-requests/[id]`
3. Body: `{ "status": "check_in" }` for a check_out request
4. **Expected:**
   - Response: 400 Bad Request
   - Message: "ERROR: Check-out requests cannot be set to check_in status"
   - errorCode: "INVALID_STATUS_TRANSITION"

### Test 5: Tab Filtering
**Objective:** Verify tabs show correct request types

1. Create multiple requests:
   - 2 check_in requests (status: check_in)
   - 2 check_out requests (status: check_out)
   - 1 rejected request (status: rejected)
2. Click each tab and verify:
   - **CHECK IN tab:** Shows only 2 check_in requests (approved, awaiting reception)
   - **ACTIVE tab:** Shows guests with status `guests` (currently staying)
   - **CHECK OUT tab:** Shows only 2 check_out requests
   - **DENIED tab:** Shows only 1 rejected request
   - **PENDING tab:** Shows requests awaiting approval
   - **ALL tab:** Shows all requests

### Test 6: Room Release on Check-Out
**Objective:** Verify room is released when check-out is approved

1. Create a check-out request for Room 101
2. Verify Room 101 status is "occupied"
3. Approve the check-out request
4. **Expected:**
   - Console shows "ROOM RELEASE OPERATION"
   - Room 101 status changes to "available"
   - Console shows "Room 101 successfully released"

---

## Validation Rules

### Allowed Status Transitions

| inquiryType | Current Status | Allowed New Statuses | Notes |
|-------------|----------------|----------------------|-------|
| check_in    | pending        | check_in, rejected   | Admin approves/rejects |
| check_in    | check_in       | guests               | Reception completes check-in |
| check_out   | pending        | check_out, rejected  | Admin approves/rejects |
| check_out   | guests         | pending              | Reception requests check-out |
| guests      | guests         | pending              | Extension or check-out request |
| any         | rejected       | (finalized)          | End state |
| check_in    | check_in       | (finalized)          | Until reception completes |
| check_out   | check_out      | (finalized)          | Room released |

### Blocked Transitions (Validation Errors)

| inquiryType | Blocked Status | Error Message |
|-------------|----------------|---------------|
| check_out   | check_in       | "Check-out requests cannot be set to check_in status" |
| check_in    | check_out      | "Check-in requests cannot be set to check_out status" |

---

## Error Handling

### Frontend Errors
1. **Request Not Found:** Displayed if request ID doesn't exist in local state
2. **Validation Error:** Displayed if inquiryType/status mismatch detected
3. **API Error:** Displayed if server returns error response
4. **Network Error:** Displayed if fetch request fails

### Backend Errors
1. **404 Not Found:** Request ID doesn't exist in database
2. **400 Bad Request:** Invalid status transition (with errorCode: "INVALID_STATUS_TRANSITION")
3. **403 Forbidden:** User doesn't have admin role
4. **500 Server Error:** Database or system error

---

## Files Modified

1. **`app/admin/reception/page.tsx`**
   - Enhanced `handleAction` function with validation
   - Improved console logging
   - Better tab routing logic
   - Added `requests` and `filter` to useCallback dependencies

2. **`app/api/reception-requests/[id]/route.ts`**
   - Added pre-update validation
   - Added post-update validation
   - Enhanced console logging
   - Better error messages with errorCode

---

## Monitoring & Debugging

### Key Console Patterns to Watch

**✅ Success Indicators:**
- `✅ [ADMIN] CHECK-IN APPROVAL DETECTED` or `✅ [ADMIN] CHECK-OUT APPROVAL DETECTED`
- `✅ [API] Status validation passed`
- `✅ [API] REQUEST UPDATED SUCCESSFULLY`

**❌ Error Indicators:**
- `❌ [ADMIN] CRITICAL VALIDATION ERROR`
- `❌ [API] CRITICAL VALIDATION ERROR`
- `❌ [API] POST-UPDATE VALIDATION ERROR`

### Troubleshooting

**Issue:** Check-out request appears in CHECK IN tab
**Solution:** 
1. Check console for validation errors
2. Verify inquiryType is "check_out" in database
3. Verify status is "check_out" in database
4. Check if filter is correctly set to "check_out"
5. Ensure the request is not showing in CHECK IN tab

**Issue:** Approval fails with validation error
**Solution:**
1. Check console for detailed error message
2. Verify inquiryType matches the action being performed
3. Check if request data is corrupted in database

---

## Future Enhancements

1. **WebSocket Integration:** Real-time tab updates without manual refresh
2. **Audit Trail:** Log all status changes for compliance
3. **Batch Operations:** Approve multiple requests at once
4. **Advanced Filters:** Filter by date range, room number, guest name
5. **Export Functionality:** Export requests to CSV/PDF

---

## Summary

This fix implements a **6-layer validation system** to ensure:
- ✅ Check-in requests ONLY appear in CHECK IN tab (after admin approval)
- ✅ Active guests (status: guests) ONLY appear in ACTIVE tab
- ✅ Check-out requests ONLY appear in CHECK OUT tab
- ✅ No mixing of request types between tabs
- ✅ Comprehensive logging for debugging
- ✅ Clear error messages for users
- ✅ Room release on check-out approval
- ✅ Proper workflow: pending → check_in → guests → check_out

### Complete Status Flow

```
CHECK-IN FLOW:
┌─────────┐     Admin       ┌──────────┐   Reception    ┌────────┐
│ PENDING ├────Approves────→│ CHECK IN ├──Completes────→│ ACTIVE │
│  (new)  │                 │(approved) │                │(guests)│
└────┬────┘                 └──────────┘                └───┬────┘
     │                                                      │
     │ Admin                                               │ Reception
     │ Rejects                                             │ Requests
     ↓                                                     │ Checkout
┌─────────┐                                               ↓
│ DENIED  │                                        ┌───────────┐
│(rejected)│                                        │  PENDING  │
└─────────┘                                        │(check_out)│
                                                   └─────┬─────┘
                                                         │
                                                   Admin Approves
                                                         ↓
                                                   ┌───────────┐
                                                   │ CHECK OUT │
                                                   │(approved) │
                                                   └───────────┘
                                                         │
                                                   Room Released
```

### Tab Organization

| Tab Label | Status | Description | Who Sees It |
|-----------|--------|-------------|-------------|
| **ALL** | all | All requests | Admin |
| **PENDING** | pending | Awaiting admin approval | Admin |
| **CHECK IN** | check_in | Approved, reception needs to complete | Admin |
| **ACTIVE** | guests | Guest currently staying | Admin |
| **DENIED** | rejected | Rejected by admin | Admin |
| **CHECK OUT** | check_out | Approved check-out, room being released | Admin |

### Key Points

1. **Admin Role:**
   - Approves pending requests → status becomes `check_in` or `check_out`
   - Rejects requests → status becomes `rejected`
   - Cannot change `check_in` to `guests` (only reception does this)

2. **Reception Role:**
   - Completes check-in → status changes from `check_in` to `guests`
   - Requests check-out → status changes from `guests` to `pending` (inquiryType: check_out)
   - Requests extension → status changes to `pending` with new checkOut date

3. **Validation Rules:**
   - check_out requests can NEVER have status `check_in`
   - check_in requests can NEVER have status `check_out`
   - Each tab only shows its corresponding status

The system is now **bulletproof** against tab mixing issues with multiple validation layers catching errors at both frontend and backend levels, with clear status naming that matches the reception workflow.
