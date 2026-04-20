# Reception Approval Flow Testing Guide

## Prerequisites

1. **Access Required:**
   - Admin account with `reception:access` permission
   - Reception account (for completing check-in)
   - Application running locally or on staging

2. **Browser Setup:**
   - Open browser console (F12)
   - Keep console visible throughout testing
   - Clear console before each test (Ctrl+L or Cmd+K)

3. **Database State:**
   - Ensure you have test rooms available
   - No conflicting test data

---

## Test 1: Check-In Approval Flow (Complete)

### Objective
Verify the complete check-in flow from admin approval to reception completion.

### Steps

#### Phase 1: Create Check-In Request (Reception)

1. **Login as Reception**
   - Navigate to `/reception`
   - Fill out the check-in form:
     - Guest Name: `Test Guest Check-In`
     - Fayda ID: `TEST123456`
     - Phone: `+251911111111`
     - Room Number: `101` (or any available room)
     - Check-In Date: Today
     - Check-Out Date: Tomorrow
     - Guests: `1`
     - Payment Method: `Cash`
     - Room Price: `1000`
   - Click "Submit"

2. **Verify Request Created**
   - Request should appear in reception page with status: `pending`
   - Note the request ID from browser network tab

#### Phase 2: Admin Approval

3. **Login as Admin**
   - Navigate to `/admin/reception`
   - Click on **PENDING** tab
   - Verify you see "Test Guest Check-In" request

4. **Review Request**
   - Click **REVIEW** button
   - Modal opens with guest details
   - Verify all information is correct
   - Add review note: `Approved for testing`
   - Click **Approve Arrival**

5. **Verify Console Output** (Expected):
```
📤 [ADMIN] =========================================
📤 [ADMIN] APPROVAL OPERATION STARTED
📤 [ADMIN] Request ID: [ID]
📤 [ADMIN] Guest Name: Test Guest Check-In
📤 [ADMIN] Inquiry Type: check_in
📤 [ADMIN] Current Status: pending
📤 [ADMIN] Requested Status: check_in
📤 [ADMIN] Status type: CHECK-IN
📤 [ADMIN] =========================================
✅ [ADMIN] Frontend validation passed: inquiryType=check_in, status=check_in

📥 [API] =========================================
📥 [API] RECEPTION REQUEST UPDATE RECEIVED
📥 [API] Request ID: [ID]
📥 [API] Requested Status: check_in
📥 [API] User Role: admin
📥 [API] =========================================
📋 [API] Current Request Details:
📋 [API] - Guest: Test Guest Check-In
📋 [API] - Inquiry Type: check_in
📋 [API] - Current Status: pending
📋 [API] - Room: 101
✅ [API] Status validation passed
✅ [API] Inquiry Type: check_in
✅ [API] Requested Status: check_in
✅ [API] Transition is VALID

✅ [API] =========================================
✅ [API] REQUEST UPDATED SUCCESSFULLY
✅ [API] Request ID: [ID]
✅ [API] Guest: Test Guest Check-In
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
```

6. **Verify Tab Switch**
   - UI should automatically switch to **CHECK IN** tab
   - Request should appear in CHECK IN tab
   - Request should NOT appear in:
     - ❌ PENDING tab
     - ❌ ACTIVE tab
     - ❌ CHECK OUT tab
     - ❌ DENIED tab

7. **Verify Counts**
   - CHECK IN tab count should be `1`
   - PENDING tab count should decrease by `1`

#### Phase 3: Reception Completes Check-In

8. **Login as Reception**
   - Navigate to `/reception`
   - Find "Test Guest Check-In" request
   - Status should show: `APPROVED` or `check_in`

9. **Complete Check-In**
   - Click **Check In** button
   - Request status changes to `guests`

10. **Verify as Admin**
    - Refresh admin reception page
    - Click on **ACTIVE** tab
    - Request should now appear in ACTIVE tab
    - Request should NOT appear in CHECK IN tab
    - Status badge shows: `GUESTS` or `ACTIVE`

### Expected Results ✅

- [ ] Request created successfully with status `pending`
- [ ] Admin approval changes status to `check_in`
- [ ] UI switches to CHECK IN tab after approval
- [ ] Console shows "CHECK-IN APPROVAL DETECTED"
- [ ] Console shows NO validation errors
- [ ] Reception can complete check-in
- [ ] Status changes to `guests` after reception completes
- [ ] Request moves to ACTIVE tab
- [ ] Request removed from CHECK IN tab

---

## Test 2: Check-Out Approval Flow (Complete)

### Objective
Verify the complete check-out flow ensuring it goes to CHECK OUT tab, NOT CHECK IN tab.

### Steps

#### Phase 1: Create Active Guest

1. **Complete Test 1 First**
   - Ensure you have an active guest (status: `guests`)
   - OR create one manually in database with:
     ```javascript
     {
       guestName: "Test Guest Check-Out",
       status: "guests",
       inquiryType: "check_in",
       roomNumber: "102",
       checkIn: "2024-01-01",
       checkOut: "2024-01-05"
     }
     ```

#### Phase 2: Reception Requests Check-Out

2. **Login as Reception**
   - Navigate to `/reception`
   - Find "Test Guest Check-Out" in ACTIVE guests
   - Click **Check Out** button

3. **Verify Request Created**
   - New request created with:
     - status: `pending`
     - inquiryType: `check_out`
   - Request appears in reception list

#### Phase 3: Admin Approval

4. **Login as Admin**
   - Navigate to `/admin/reception`
   - Click on **PENDING** tab
   - Verify you see "Test Guest Check-Out" request
   - Status badge: `PENDING`
   - Action tag: `CHECK-OUT`

5. **Review Request**
   - Click **REVIEW** button
   - Verify inquiryType is `check_out`
   - Add review note: `Check-out approved for testing`
   - Click **Approve Departure**

6. **Verify Console Output** (Expected):
```
📤 [ADMIN] =========================================
📤 [ADMIN] APPROVAL OPERATION STARTED
📤 [ADMIN] Request ID: [ID]
📤 [ADMIN] Guest Name: Test Guest Check-Out
📤 [ADMIN] Inquiry Type: check_out
📤 [ADMIN] Current Status: pending
📤 [ADMIN] Requested Status: check_out
📤 [ADMIN] Status type: CHECK-OUT
📤 [ADMIN] =========================================
✅ [ADMIN] Frontend validation passed: inquiryType=check_out, status=check_out

📥 [API] =========================================
📥 [API] RECEPTION REQUEST UPDATE RECEIVED
📥 [API] Request ID: [ID]
📥 [API] Requested Status: check_out
📥 [API] User Role: admin
📥 [API] =========================================
📋 [API] Current Request Details:
📋 [API] - Guest: Test Guest Check-Out
📋 [API] - Inquiry Type: check_out
📋 [API] - Current Status: pending
📋 [API] - Room: 102
✅ [API] Status validation passed
✅ [API] Inquiry Type: check_out
✅ [API] Requested Status: check_out
✅ [API] Transition is VALID

✅ [API] =========================================
✅ [API] REQUEST UPDATED SUCCESSFULLY
✅ [API] Request ID: [ID]
✅ [API] Guest: Test Guest Check-Out
✅ [API] Final Status: check_out
✅ [API] Inquiry Type: check_out
✅ [API] =========================================

🔑 [API] =========================================
🔑 [API] ROOM RELEASE OPERATION
🔑 [API] Releasing room 102
🔑 [API] Guest: Test Guest Check-Out
🔑 [API] Status: check_out
🔑 [API] =========================================
✅ [API] Room 102 successfully released to available status

✅ [ADMIN] =========================================
✅ [ADMIN] APPROVAL SUCCESSFUL
✅ [ADMIN] Request status updated to: check_out
✅ [ADMIN] Confirmed status in response: check_out
✅ [ADMIN] Response inquiryType: check_out
✅ [ADMIN] =========================================

🔄 [ADMIN] ✅ CHECK-OUT APPROVAL DETECTED
🔄 [ADMIN] Setting filter to: check_out (CHECK OUT tab)
🔄 [ADMIN] ⚠️ CONFIRMATION: This request will appear in CHECK OUT tab, NOT CHECK IN tab
🔄 [ADMIN] Inquiry Type: check_out
🔄 [ADMIN] Final Status: check_out
```

7. **CRITICAL: Verify Tab Switch**
   - UI should automatically switch to **CHECK OUT** tab
   - Request should appear in CHECK OUT tab
   - Request should NOT appear in:
     - ❌ PENDING tab
     - ❌ CHECK IN tab (MOST IMPORTANT!)
     - ❌ ACTIVE tab
     - ❌ DENIED tab

8. **Verify Counts**
   - CHECK OUT tab count should be `1`
   - PENDING tab count should decrease by `1`
   - CHECK IN tab count should NOT change

9. **Verify Room Release**
   - Check room 102 status in database
   - Should be: `available`
   - Console shows: "Room 102 successfully released to available status"

### Expected Results ✅

- [ ] Check-out request created with status `pending`
- [ ] Admin approval changes status to `check_out`
- [ ] UI switches to CHECK OUT tab after approval
- [ ] UI does NOT switch to CHECK IN tab
- [ ] Console shows "CHECK-OUT APPROVAL DETECTED"
- [ ] Console shows "ROOM RELEASE OPERATION"
- [ ] Console shows "Room released to available status"
- [ ] Console shows NO validation errors
- [ ] Request appears in CHECK OUT tab
- [ ] Request does NOT appear in CHECK IN tab
- [ ] Room status changes to `available`

---

## Test 3: Validation Error Prevention

### Objective
Verify that the system prevents invalid status transitions.

### Steps

#### Test 3A: Frontend Validation

1. **Setup**
   - Create a check-out request (status: `pending`, inquiryType: `check_out`)
   - Open browser console
   - Open Network tab

2. **Attempt Invalid Action**
   - In browser console, run:
   ```javascript
   // Try to approve check_out as check_in (should fail)
   fetch('/api/reception-requests/[REQUEST_ID]', {
     method: 'PUT',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer [YOUR_TOKEN]'
     },
     body: JSON.stringify({ status: 'check_in' })
   }).then(r => r.json()).then(console.log)
   ```

3. **Verify Frontend Blocks It** (if using UI):
   - If somehow UI tries to approve check_out as check_in:
```
❌ [ADMIN] CRITICAL VALIDATION ERROR: Check-out request cannot be approved as check-in!
❌ [ADMIN] This is a BUG - please report to development team
```
   - Error notification displayed
   - Operation blocked before API call

4. **Verify Backend Blocks It**:
```
❌ [API] =========================================
❌ [API] CRITICAL VALIDATION ERROR
❌ [API] Attempting to set check_out request to check_in status!
❌ [API] Request ID: [ID]
❌ [API] Guest: Test Guest
❌ [API] Inquiry Type: check_out
❌ [API] Attempted Status: check_in
❌ [API] This is INVALID - check_out requests must use check_out status
❌ [API] =========================================
```
   - Response: `400 Bad Request`
   - Message: "ERROR: Check-out requests cannot be set to check_in status"
   - errorCode: "INVALID_STATUS_TRANSITION"

#### Test 3B: Reverse Validation

5. **Attempt Reverse Invalid Action**
   - Create check-in request (status: `pending`, inquiryType: `check_in`)
   - Try to approve as check_out:
   ```javascript
   fetch('/api/reception-requests/[REQUEST_ID]', {
     method: 'PUT',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer [YOUR_TOKEN]'
     },
     body: JSON.stringify({ status: 'check_out' })
   }).then(r => r.json()).then(console.log)
   ```

6. **Verify Backend Blocks It**:
```
❌ [API] =========================================
❌ [API] CRITICAL VALIDATION ERROR
❌ [API] Attempting to set check_in request to check_out status!
❌ [API] Request ID: [ID]
❌ [API] Guest: Test Guest
❌ [API] Inquiry Type: check_in
❌ [API] Attempted Status: check_out
❌ [API] This is INVALID - check_in requests must use check_in status
❌ [API] =========================================
```
   - Response: `400 Bad Request`
   - Message: "ERROR: Check-in requests cannot be set to check_out status"

### Expected Results ✅

- [ ] Frontend validation blocks invalid transitions
- [ ] Backend validation blocks invalid transitions
- [ ] Error messages are clear and descriptive
- [ ] HTTP 400 status returned
- [ ] errorCode: "INVALID_STATUS_TRANSITION" included
- [ ] No database changes on failed validation
- [ ] Console shows detailed error logs

---

## Test 4: Tab Filtering Verification

### Objective
Verify each tab shows only the correct request types.

### Steps

1. **Create Multiple Test Requests**
   - 2 check_in requests with status `check_in`
   - 2 check_out requests with status `check_out`
   - 1 request with status `guests`
   - 1 request with status `rejected`
   - 1 request with status `pending`

2. **Test Each Tab**

   **ALL Tab:**
   - Should show: 7 requests (all of them)
   - Count badge: `7`

   **PENDING Tab:**
   - Should show: 1 request
   - Count badge: `1`
   - Only status `pending`

   **CHECK IN Tab:**
   - Should show: 2 requests
   - Count badge: `2`
   - Only inquiryType `check_in` with status `check_in`
   - Should NOT show any check_out requests

   **ACTIVE Tab:**
   - Should show: 1 request
   - Count badge: `1`
   - Only status `guests`
   - Should NOT show any check_in or check_out requests

   **DENIED Tab:**
   - Should show: 1 request
   - Count badge: `1`
   - Only status `rejected`

   **CHECK OUT Tab:**
   - Should show: 2 requests
   - Count badge: `2`
   - Only inquiryType `check_out` with status `check_out`
   - Should NOT show any check_in requests

3. **Verify No Mixing**
   - Switch between tabs rapidly
   - Verify no check_out requests in CHECK IN tab
   - Verify no check_in requests in CHECK OUT tab
   - Verify counts match expected values

### Expected Results ✅

- [ ] ALL tab shows all requests
- [ ] PENDING tab shows only pending requests
- [ ] CHECK IN tab shows only check_in requests
- [ ] ACTIVE tab shows only guests with status `guests`
- [ ] DENIED tab shows only rejected requests
- [ ] CHECK OUT tab shows only check_out requests
- [ ] No mixing between CHECK IN and CHECK OUT tabs
- [ ] Count badges are accurate
- [ ] Tab switching works smoothly

---

## Test 5: Edge Cases

### Objective
Test edge cases and error handling.

### Steps

1. **Test: Approve Non-Existent Request**
   - Try to approve request with invalid ID
   - Expected: 404 Not Found

2. **Test: Double Approval**
   - Approve a request
   - Try to approve it again
   - Expected: Should handle gracefully

3. **Test: Network Failure**
   - Disconnect internet
   - Try to approve request
   - Expected: Network error notification
```
❌ [ADMIN] =========================================
❌ [ADMIN] NETWORK ERROR
❌ [ADMIN] Error: [error details]
❌ [ADMIN] =========================================
```

4. **Test: Concurrent Approvals**
   - Open two admin tabs
   - Approve same request in both
   - Expected: Second approval should handle gracefully

5. **Test: Missing Room Number**
   - Create check-out request without roomNumber
   - Approve it
   - Expected: Warning logged, no crash
```
⚠️ [API] Check-out approved but no room number found for guest: [Name]
```

### Expected Results ✅

- [ ] Invalid ID returns 404
- [ ] Double approval handled gracefully
- [ ] Network errors show user-friendly message
- [ ] Concurrent approvals don't break system
- [ ] Missing room number logs warning but doesn't crash

---

## Quick Test Checklist

Use this checklist for rapid testing:

### Check-In Flow
- [ ] Create check-in request (pending)
- [ ] Admin approves → status becomes check_in
- [ ] UI switches to CHECK IN tab
- [ ] Console shows "CHECK-IN APPROVAL DETECTED"
- [ ] Reception completes → status becomes guests
- [ ] Request moves to ACTIVE tab
- [ ] No errors in console

### Check-Out Flow
- [ ] Create check-out request (pending)
- [ ] Admin approves → status becomes check_out
- [ ] UI switches to CHECK OUT tab
- [ ] UI does NOT switch to CHECK IN tab
- [ ] Console shows "CHECK-OUT APPROVAL DETECTED"
- [ ] Console shows "ROOM RELEASE OPERATION"
- [ ] Room status changes to available
- [ ] Request appears in CHECK OUT tab
- [ ] Request does NOT appear in CHECK IN tab
- [ ] No errors in console

### Validation
- [ ] check_out cannot be approved as check_in
- [ ] check_in cannot be approved as check_out
- [ ] Error messages are clear
- [ ] HTTP 400 returned for invalid transitions

### Tabs
- [ ] CHECK IN tab shows only check_in requests
- [ ] CHECK OUT tab shows only check_out requests
- [ ] ACTIVE tab shows only guests
- [ ] No mixing between tabs
- [ ] Count badges accurate

---

## Troubleshooting

### Issue: Check-out appears in CHECK IN tab

**Solution:**
1. Check console for validation errors
2. Verify inquiryType is "check_out" in database
3. Verify status is "check_out" in database
4. Check if there are any cached responses
5. Hard refresh browser (Ctrl+Shift+R)

### Issue: Approval fails with validation error

**Solution:**
1. Check console for detailed error message
2. Verify inquiryType matches the action
3. Check database for corrupted data
4. Verify request hasn't been already approved

### Issue: Room not released on check-out

**Solution:**
1. Check console for "ROOM RELEASE OPERATION" log
2. Verify roomNumber exists on request
3. Check Room collection for matching roomNumber
4. Verify room exists in database

### Issue: Tab counts don't match

**Solution:**
1. Refresh page to refetch data
2. Check browser console for fetch errors
3. Verify API returns correct data
4. Check for duplicate requests in database

---

## Success Criteria

All tests pass when:
✅ Check-in requests go through complete flow without errors
✅ Check-out requests go through complete flow without errors
✅ Check-out requests NEVER appear in CHECK IN tab
✅ Check-in requests NEVER appear in CHECK OUT tab
✅ All validation layers work correctly
✅ Console logs are clear and helpful
✅ Room release works on check-out
✅ Tab filtering is accurate
✅ Error handling is graceful
✅ No mixing of request types between tabs

---

## Post-Test Cleanup

After testing:
1. Delete all test requests from database
2. Reset test rooms to available status
3. Clear browser cache
4. Document any issues found
5. Report bugs with console logs attached

---

## Reporting Issues

If you find any issues, please provide:
1. **Test number** that failed
2. **Console logs** (copy full output)
3. **Network tab** response
4. **Database state** (request document)
5. **Steps to reproduce**
6. **Expected vs actual behavior**
