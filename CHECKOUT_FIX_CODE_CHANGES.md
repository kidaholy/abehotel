# Checkout Status Fix - Code Changes

## File: app/api/reception-requests/[id]/route.ts

### Change Location: Lines 55-85

### BEFORE (Broken Code)
```typescript
console.log(`📋 [API] Current Request Details:`)
console.log(`📋 [API] - Guest: ${currentRequest.guestName}`)
console.log(`📋 [API] - Inquiry Type: ${currentRequest.inquiryType}`)
console.log(`📋 [API] - Current Status: ${currentRequest.status}`)
console.log(`📋 [API] - Room: ${currentRequest.roomNumber}`)

// CRITICAL VALIDATION: Ensure check_out requests never go to check_in status
if (currentRequest.inquiryType === "check_out" && (status === "CHECKIN_APPROVED" || status === "CHECKIN_PENDING" || status === "check_in")) {
  return NextResponse.json({ message: "ERROR: Check-out requests cannot be set to check_in status." }, { status: 400 })
}

// CRITICAL VALIDATION: Ensure check_in requests never go to check_out status
if (currentRequest.inquiryType === "check_in" && (status === "CHECKOUT_APPROVED" || status === "CHECKOUT_PENDING" || status === "CHECKED_OUT" || status === "check_out")) {
  return NextResponse.json({ message: "ERROR: Check-in requests cannot be set to check_out status." }, { status: 400 })
}

console.log(`✅ [API] Status validation passed`)
console.log(`✅ [API] Inquiry Type: ${currentRequest.inquiryType}`)
console.log(`✅ [API] Requested Status: ${status}`)
console.log(`✅ [API] Transition is VALID`)
```

### AFTER (Fixed Code)
```typescript
console.log(`📋 [API] Current Request Details:`)
console.log(`📋 [API] - Guest: ${currentRequest.guestName}`)
console.log(`📋 [API] - Inquiry Type: ${currentRequest.inquiryType}`)
console.log(`📋 [API] - Current Status: ${currentRequest.status}`)
console.log(`📋 [API] - Room: ${currentRequest.roomNumber}`)
console.log(`📋 [API] - New Inquiry Type (if provided): ${inquiryType || "not changing"}`)

// Use the NEW inquiryType if provided, otherwise use the current one
const effectiveInquiryType = inquiryType || currentRequest.inquiryType
console.log(`📋 [API] - Effective Inquiry Type for validation: ${effectiveInquiryType}`)

// CRITICAL VALIDATION: Ensure check_out requests never go to check_in status
if (effectiveInquiryType === "check_out" && (status === "CHECKIN_APPROVED" || status === "CHECKIN_PENDING" || status === "check_in")) {
  console.error(`❌ [API] VALIDATION FAILED: Check-out request cannot transition to check-in status`)
  return NextResponse.json({ message: "ERROR: Check-out requests cannot be set to check-in status." }, { status: 400 })
}

// CRITICAL VALIDATION: Ensure check_in requests never go to check_out status
// BUT: Allow transition from ACTIVE (check_in) to CHECKOUT_PENDING when inquiryType is being changed to check_out
if (effectiveInquiryType === "check_in" && (status === "CHECKOUT_APPROVED" || status === "CHECKOUT_PENDING" || status === "CHECKED_OUT" || status === "check_out")) {
  // Special case: Allow ACTIVE -> CHECKOUT_PENDING if inquiryType is being changed to check_out
  if (!(currentRequest.status === "ACTIVE" && status === "CHECKOUT_PENDING" && inquiryType === "check_out")) {
    console.error(`❌ [API] VALIDATION FAILED: Check-in request cannot transition to check-out status`)
    return NextResponse.json({ message: "ERROR: Check-in requests cannot be set to check-out status." }, { status: 400 })
  }
}

console.log(`✅ [API] Status validation passed`)
console.log(`✅ [API] Inquiry Type: ${currentRequest.inquiryType}`)
console.log(`✅ [API] Effective Inquiry Type: ${effectiveInquiryType}`)
console.log(`✅ [API] Requested Status: ${status}`)
console.log(`✅ [API] Transition is VALID`)
```

## Key Differences

### 1. Extract New inquiryType
```typescript
// NEW: Get the inquiryType from the request body
console.log(`📋 [API] - New Inquiry Type (if provided): ${inquiryType || "not changing"}`)
```

### 2. Calculate Effective inquiryType
```typescript
// NEW: Use NEW value if provided, otherwise use current value
const effectiveInquiryType = inquiryType || currentRequest.inquiryType
console.log(`📋 [API] - Effective Inquiry Type for validation: ${effectiveInquiryType}`)
```

### 3. Use Effective inquiryType in Validation
```typescript
// CHANGED: Use effectiveInquiryType instead of currentRequest.inquiryType
if (effectiveInquiryType === "check_out" && ...) { /* ... */ }
if (effectiveInquiryType === "check_in" && ...) { /* ... */ }
```

### 4. Add Special Case for Checkout
```typescript
// NEW: Allow ACTIVE -> CHECKOUT_PENDING when inquiryType changes to check_out
if (effectiveInquiryType === "check_in" && (status === "CHECKOUT_APPROVED" || ...)) {
  // Special case: Allow ACTIVE -> CHECKOUT_PENDING if inquiryType is being changed to check_out
  if (!(currentRequest.status === "ACTIVE" && status === "CHECKOUT_PENDING" && inquiryType === "check_out")) {
    // Block the transition
  }
}
```

### 5. Improved Logging
```typescript
// NEW: Added more detailed logging
console.error(`❌ [API] VALIDATION FAILED: ...`)
console.log(`✅ [API] Effective Inquiry Type: ${effectiveInquiryType}`)
```

## Why These Changes Fix the Issue

### Problem Scenario
```
Request in DB: inquiryType="check_in", status="ACTIVE"
Frontend sends: status="CHECKOUT_PENDING", inquiryType="check_out"

OLD CODE:
  if (currentRequest.inquiryType === "check_in" && status === "CHECKOUT_PENDING") {
    // TRUE - Block the request ❌
  }

NEW CODE:
  const effectiveInquiryType = "check_out" (from request body)
  if (effectiveInquiryType === "check_in" && status === "CHECKOUT_PENDING") {
    // FALSE - Don't block
    if (!(currentRequest.status === "ACTIVE" && status === "CHECKOUT_PENDING" && inquiryType === "check_out")) {
      // FALSE - Special case allows it ✅
    }
  }
```

## Testing the Fix

### Test 1: Verify effectiveInquiryType is Calculated
Check API logs for:
```
📋 [API] - Inquiry Type: check_in
📋 [API] - New Inquiry Type (if provided): check_out
📋 [API] - Effective Inquiry Type for validation: check_out
```

### Test 2: Verify Special Case Allows Transition
Check API logs for:
```
✅ [API] Status validation passed
✅ [API] Effective Inquiry Type: check_out
✅ [API] Requested Status: CHECKOUT_PENDING
✅ [API] Transition is VALID
```

### Test 3: Verify Checkout Approval Works
Check API logs for:
```
✅ [API] REQUEST UPDATED SUCCESSFULLY
✅ [API] Final Status: CHECKOUT_APPROVED
✅ [API] Inquiry Type: check_out
```

## Backward Compatibility

✅ Existing code that doesn't provide inquiryType still works
✅ effectiveInquiryType falls back to currentRequest.inquiryType
✅ No breaking changes to API contract
✅ No database schema changes needed

## Performance Impact

✅ Minimal - just one additional variable assignment
✅ No additional database queries
✅ No additional API calls
✅ Improved logging for debugging (minimal overhead)

## Rollback Plan

If needed, simply revert to the old validation logic:
1. Remove the effectiveInquiryType calculation
2. Change validation to use currentRequest.inquiryType
3. Remove the special case check
4. Redeploy

No data migration or cleanup needed.
