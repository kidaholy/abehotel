# Checkout Status Workflow - Visual Guide

## Status Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GUEST CHECK-IN WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

    Guest Arrives
         │
         ▼
    ┌──────────────────────┐
    │ CHECKIN_PENDING      │  ◄─── Reception submits check-in request
    │ "CHECK-IN PENDING"   │       Status: Yellow badge
    │ (Yellow Badge)       │
    └──────────────────────┘
         │
         ├─ DENY ──────────────────────┐
         │                             │
         ▼                             ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ CHECKIN_APPROVED     │    │ REJECTED             │
    │ "CHECK-IN APPROVED"  │    │ "REJECTED"           │
    │ (Blue Badge)         │    │ (Red Badge)          │
    └──────────────────────┘    └──────────────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ ACTIVE               │  ◄─── Admin completes check-in
    │ "CHECKED IN"         │       Guest is now checked in
    │ (Emerald Badge)      │
    └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        GUEST CHECKOUT WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

    Guest Requests Checkout
         │
         ▼
    ┌──────────────────────┐
    │ CHECKOUT_PENDING     │  ◄─── Guest initiates checkout
    │ "CHECKOUT PENDING"   │       Status: Orange badge
    │ (Orange Badge)       │
    └──────────────────────┘
         │
         ├─ DENY ──────────────────────┐
         │                             │
         ▼                             ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │ CHECKOUT_APPROVED    │    │ REJECTED             │
    │ "CHECKOUT APPROVED"  │    │ "REJECTED"           │
    │ (Purple Badge)       │    │ (Red Badge)          │
    └──────────────────────┘    └──────────────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ CHECKED_OUT          │  ◄─── Room released to available
    │ "CHECKED OUT"        │       Guest checkout complete
    │ (Gray Badge)         │
    └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE GUEST LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────────┘

    CHECKIN_PENDING
         │
         ▼
    CHECKIN_APPROVED
         │
         ▼
    ACTIVE (Guest Staying)
         │
         ├─ Extend Stay ──────────────────────┐
         │                                    │
         │                          CHECKOUT_PENDING
         │                                    │
         │                                    ▼
         │                          CHECKOUT_APPROVED
         │                                    │
         ▼                                    ▼
    CHECKOUT_PENDING ──────────────► CHECKED_OUT
         │
         ▼
    CHECKOUT_APPROVED
         │
         ▼
    CHECKED_OUT


┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATUS COLOR LEGEND                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    🟨 YELLOW   = Pending Approval (CHECKIN_PENDING, CHECKOUT_PENDING)
    🟦 BLUE     = Check-In Approved (CHECKIN_APPROVED)
    🟩 EMERALD  = Currently Checked In (ACTIVE)
    🟧 ORANGE   = Checkout Pending (CHECKOUT_PENDING)
    🟪 PURPLE   = Checkout Approved (CHECKOUT_APPROVED)
    ⬜ GRAY     = Checked Out (CHECKED_OUT)
    🟥 RED      = Rejected (REJECTED)


┌─────────────────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD ACTION BUTTONS                           │
└─────────────────────────────────────────────────────────────────────────────┘

For CHECKIN_PENDING:
    ┌─────────────────────────────────────────────────────────┐
    │ [DENY]  [APPROVE ARRIVAL]                               │
    └─────────────────────────────────────────────────────────┘
         │           │
         ▼           ▼
    REJECTED    CHECKIN_APPROVED

For CHECKIN_APPROVED:
    ┌─────────────────────────────────────────────────────────┐
    │ [COMPLETE CHECK-IN]                                     │
    └─────────────────────────────────────────────────────────┘
         │
         ▼
    ACTIVE

For ACTIVE:
    ┌─────────────────────────────────────────────────────────┐
    │ [CHECK OUT]  [EXTEND]                                   │
    └─────────────────────────────────────────────────────────┘
         │           │
         ▼           ▼
    CHECKOUT_PENDING  (New Checkout Date)

For CHECKOUT_PENDING:
    ┌─────────────────────────────────────────────────────────┐
    │ [DENY]  [APPROVE DEPARTURE]                             │
    └─────────────────────────────────────────────────────────┘
         │           │
         ▼           ▼
    REJECTED    CHECKOUT_APPROVED


┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROOM STATUS TRANSITIONS                                │
└─────────────────────────────────────────────────────────────────────────────┘

    Available
         │
         ▼
    CHECKIN_APPROVED ──────────► Occupied
         │
         ▼
    ACTIVE ──────────────────────► Occupied
         │
         ▼
    CHECKOUT_PENDING ────────────► Available (Released)
         │
         ▼
    CHECKOUT_APPROVED ───────────► Available (Released)
         │
         ▼
    CHECKED_OUT ──────────────────► Available (Released)


┌─────────────────────────────────────────────────────────────────────────────┐
│                    VALIDATION RULES (API LEVEL)                             │
└─────────────────────────────────────────────────────────────────────────────┘

Check-Out Request (inquiryType = "check_out")
    ✅ Can transition to:
       • CHECKOUT_PENDING
       • CHECKOUT_APPROVED
       • CHECKED_OUT
       • REJECTED
       • pending (legacy)
       • check_out (legacy)
       • rejected (legacy)

    ❌ Cannot transition to:
       • CHECKIN_APPROVED ◄─── BLOCKED
       • CHECKIN_PENDING ◄─── BLOCKED
       • ACTIVE
       • check_in ◄─── BLOCKED

Check-In Request (inquiryType = "check_in")
    ✅ Can transition to:
       • CHECKIN_PENDING
       • CHECKIN_APPROVED
       • ACTIVE
       • REJECTED
       • pending (legacy)
       • check_in (legacy)
       • guests (legacy)
       • rejected (legacy)

    ❌ Cannot transition to:
       • CHECKOUT_APPROVED ◄─── BLOCKED
       • CHECKOUT_PENDING ◄─── BLOCKED
       • CHECKED_OUT ◄─── BLOCKED
       • check_out ◄─── BLOCKED


┌─────────────────────────────────────────────────────────────────────────────┐
│                         BEFORE vs AFTER                                     │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE (❌ Problem):
    Check-In Approved  ──► Badge: "APPROVED"
    Checkout Approved  ──► Badge: "APPROVED"  ◄─── SAME LABEL!
    
    Result: Staff cannot distinguish between the two operations

AFTER (✅ Fixed):
    Check-In Approved  ──► Badge: "CHECK-IN APPROVED" (Blue)
    Checkout Approved  ──► Badge: "CHECKOUT APPROVED" (Purple)
    
    Result: Staff can instantly see the difference


┌─────────────────────────────────────────────────────────────────────────────┐
│                      QUICK STATUS LOOKUP TABLE                              │
└─────────────────────────────────────────────────────────────────────────────┘

Status                  Label                   Color    Meaning
─────────────────────────────────────────────────────────────────────────────
CHECKIN_PENDING         CHECK-IN PENDING        🟨       Awaiting check-in approval
CHECKIN_APPROVED        CHECK-IN APPROVED       🟦       Check-in approved
ACTIVE                  CHECKED IN              🟩       Guest is staying
CHECKOUT_PENDING        CHECKOUT PENDING        🟧       Awaiting checkout approval
CHECKOUT_APPROVED       CHECKOUT APPROVED       🟪       Checkout approved
CHECKED_OUT             CHECKED OUT             ⬜       Guest has left
REJECTED                REJECTED                🟥       Request denied

Legacy (Backward Compatible):
pending                 PENDING                 🟨       (Old: CHECKIN_PENDING)
guests                  CHECKED IN              🟩       (Old: ACTIVE)
check_in                CHECK-IN APPROVED       🟦       (Old: CHECKIN_APPROVED)
check_out               CHECKED OUT             ⬜       (Old: CHECKED_OUT)
rejected                REJECTED                🟥       (Old: REJECTED)
