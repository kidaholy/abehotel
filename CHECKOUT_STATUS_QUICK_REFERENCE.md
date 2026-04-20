# Checkout Status Workflow - Quick Reference

## Status States

### Check-In Workflow
| Status | Display Label | Color | Meaning |
|--------|---------------|-------|---------|
| CHECKIN_PENDING | CHECK-IN PENDING | Yellow | Guest arrival request submitted, awaiting approval |
| CHECKIN_APPROVED | CHECK-IN APPROVED | Blue | Check-in approved, guest can enter |
| ACTIVE | CHECKED IN | Emerald | Guest is currently checked in |

### Checkout Workflow
| Status | Display Label | Color | Meaning |
|--------|---------------|-------|---------|
| CHECKOUT_PENDING | CHECKOUT PENDING | Orange | Guest checkout request submitted, awaiting approval |
| CHECKOUT_APPROVED | CHECKOUT APPROVED | Purple | Checkout approved, guest has left |
| CHECKED_OUT | CHECKED OUT | Gray | Guest checkout completed, room released |

### Other States
| Status | Display Label | Color | Meaning |
|--------|---------------|-------|---------|
| REJECTED | REJECTED | Red | Request denied |

## Key Differences

### Before Fix ❌
- Both check-in and checkout approvals showed as "APPROVED"
- Impossible to distinguish guest status at a glance
- Checkout could revert to check-in status
- Confusion in workflow tracking

### After Fix ✅
- Check-in approval shows as "CHECK-IN APPROVED"
- Checkout approval shows as "CHECKOUT APPROVED"
- Clear visual distinction with different colors
- Checkout cannot revert to check-in status
- Clear workflow tracking

## Admin Dashboard Actions

### For Check-In Requests (CHECKIN_PENDING)
1. **Deny** → Status becomes REJECTED
2. **Approve Arrival** → Status becomes CHECKIN_APPROVED

### For Check-In Approved (CHECKIN_APPROVED)
1. **Complete Check-In** → Status becomes ACTIVE (guest checked in)

### For Active Guests (ACTIVE)
1. **Check Out** → Status becomes CHECKOUT_PENDING
2. **Extend** → Allows extending checkout date

### For Checkout Requests (CHECKOUT_PENDING)
1. **Deny** → Status becomes REJECTED
2. **Approve Departure** → Status becomes CHECKOUT_APPROVED

## API Validation Rules

### Check-Out Requests Cannot:
- ❌ Transition to CHECKIN_APPROVED
- ❌ Transition to CHECKIN_PENDING
- ❌ Transition to check_in

### Check-In Requests Cannot:
- ❌ Transition to CHECKOUT_APPROVED
- ❌ Transition to CHECKOUT_PENDING
- ❌ Transition to CHECKED_OUT
- ❌ Transition to check_out

## Room Management

### Room Status Changes
- **Check-In Approved** → Room status: occupied
- **Checkout Approved** → Room status: available (released)
- **Checkout Pending** → Room status: available (released)

## Common Scenarios

### Scenario 1: Guest Arrives
```
1. Reception submits check-in request
   Status: CHECKIN_PENDING
2. Manager approves
   Status: CHECKIN_APPROVED
3. Admin completes check-in
   Status: ACTIVE
```

### Scenario 2: Guest Checks Out
```
1. Guest requests checkout
   Status: CHECKOUT_PENDING
2. Manager approves
   Status: CHECKOUT_APPROVED
3. Room released to available
```

### Scenario 3: Guest Extends Stay
```
1. Guest is ACTIVE
2. Reception requests extension with new date
   Status: CHECKOUT_PENDING (with new checkout date)
3. Manager approves new date
   Status: CHECKOUT_APPROVED
```

## Troubleshooting

### Issue: Status won't change to checkout
**Solution**: Ensure the request's inquiryType is "check_out". Check-in requests cannot transition to checkout statuses.

### Issue: Status reverted to check-in
**Solution**: This should no longer happen. If it does, check the API logs for validation errors.

### Issue: Room not released after checkout
**Solution**: Verify the room number is correctly set in the request. Check API logs for room release operations.

## Dashboard Tips

- **Yellow badges** = Pending approval
- **Blue badges** = Check-in approved
- **Emerald badges** = Currently checked in
- **Orange badges** = Checkout pending
- **Purple badges** = Checkout approved
- **Gray badges** = Checked out
- **Red badges** = Rejected

Use these colors to quickly scan guest status at a glance!
