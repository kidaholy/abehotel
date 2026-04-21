# Cashier Revenue Breakdown Explanation

## What Are The Two Differentiated Values?

The two (or more) values shown for each cashier represent **revenue breakdown by floor/location** where the cashier worked.

## Example from Your Screenshot

### GROUND FLOOR CASHIER 1
```
Total Revenue: 200,950 Br
├─ GROUND: 196,930 Br  (Sales from Ground Floor)
└─ I5: 4,930 Br        (Sales from Floor I5)
```

### FLOOR 1(SOSNA ABERA) CASHER 2
```
Total Revenue: 78,130 Br
├─ I1: 64,430 Br       (Sales from Floor I1)
└─ I2: 13,690 Br       (Sales from Floor I2)
```

## What Does This Mean?

### The Breakdown Shows:
- **Which floors/locations** the cashier processed orders from
- **How much revenue** came from each floor
- **Where the cashier worked** during the period

### Why Multiple Values?

A cashier might work in different locations:
1. **Same cashier, different floors** - They might work Ground Floor one day and Floor 2 another day
2. **Same cashier, different areas** - They might cover multiple service areas
3. **Shared cashier** - One cashier might handle orders from multiple locations

## How It's Calculated

```typescript
// For each order:
const cashierName = order.createdBy.name  // "GROUND FLOOR CASHIER 1"
const floorLabel = order.floorNumber      // "GROUND" or "I5"
const amount = order.totalAmount          // 196,930 or 4,930

// Group by cashier, then by floor
cashierRevenue[cashierName].breakdowns[floorLabel] += amount
```

## Real-World Example

**Scenario:** "John Doe" is a cashier who works in multiple areas

**Orders processed:**
```
Order 1: Ground Floor, 50,000 Br
Order 2: Ground Floor, 146,930 Br
Order 3: Floor I5, 4,930 Br
```

**Report shows:**
```
JOHN DOE: 200,950 Br (Total)
├─ GROUND: 196,930 Br (Orders 1 + 2)
└─ I5: 4,930 Br       (Order 3)
```

## Why This Matters

### For Management:
- ✅ See which locations generate most revenue
- ✅ Understand cashier workload distribution
- ✅ Identify busy vs. quiet areas
- ✅ Plan staffing accordingly

### For Analysis:
- ✅ Track revenue by location
- ✅ Identify high-performing areas
- ✅ Monitor cashier efficiency per location
- ✅ Detect unusual patterns

## Display Format

In the report, it shows like this:

```
CASHIER CONTRIBUTIONS

• GROUND FLOOR CASHIER 1                    200,950 Br
  72.0% of total revenue
  GROUND: 196,930 Br    I5: 4,930 Br

• FLOOR 1(SOSNA ABERA) CASHER 2             78,130 Br
  28.0% of total revenue
  I1: 64,430 Br    I2: 13,690 Br
```

## Key Points

1. **Total = Sum of all breakdowns**
   - 200,950 = 196,930 + 4,930 ✓

2. **Each breakdown is a floor/location**
   - GROUND, I5, I1, I2 are floor numbers

3. **Sorted by amount (largest first)**
   - GROUND (196,930) shows before I5 (4,930)

4. **Shows percentage of total revenue**
   - 72.0% means this cashier generated 72% of all orders

5. **Multiple breakdowns = Multiple locations**
   - If only one floor: shows only one breakdown
   - If multiple floors: shows all of them

## Common Scenarios

### Scenario 1: Single Location Cashier
```
CASHIER A: 100,000 Br
└─ GROUND: 100,000 Br
(Only one breakdown - worked only on Ground Floor)
```

### Scenario 2: Multi-Location Cashier
```
CASHIER B: 150,000 Br
├─ GROUND: 80,000 Br
├─ FLOOR 1: 50,000 Br
└─ FLOOR 2: 20,000 Br
(Three breakdowns - worked on three floors)
```

### Scenario 3: Roaming Cashier
```
CASHIER C: 200,000 Br
├─ I1: 60,000 Br
├─ I2: 70,000 Br
├─ I3: 50,000 Br
└─ I4: 20,000 Br
(Four breakdowns - covers multiple areas)
```

## Technical Implementation

**Code Location:** `app/admin/reports/page.tsx` lines 203-227

```typescript
const cashierRevenueMap = filteredOrders
    .filter(o => o.status !== "cancelled" && !o.isDeleted)
    .reduce((acc, o) => {
        const cashierName = o.createdBy?.name;
        const floorLabel = o.floorNumber || "Other";
        
        // Add to total
        acc[cashierName].total += o.totalAmount;
        
        // Add to floor breakdown
        acc[cashierName].breakdowns[floorLabel] += o.totalAmount;
        
        return acc;
    }, {});
```

## Summary

The two (or more) differentiated values for each cashier are:
- **Total Revenue** = Sum of all their orders
- **Breakdown by Floor** = How much came from each location

This helps you understand:
- Where each cashier worked
- Which locations are busiest
- How revenue is distributed across floors
- Cashier workload and efficiency per location

It's a **location-based breakdown**, not a different type of revenue!
