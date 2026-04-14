# Bugfix Design Document

## Root Cause Analysis

### Problem Location
**File:** `app/admin/store/page.tsx`  
**Line:** 1016  
**Current Code:**
```typescript
const totalStats = {
    storeValue: stockItems.reduce((sum, item) => sum + (item.totalInvestment || 0), 0),
    // ...
}
```

### Additional Issue Found
**File:** `app/admin/store/page.tsx` (Form fields)  
**Issue:** The form field labeled "Unit Purchased Price" was actually storing `totalPurchaseCost` (total cost for all units), not the unit price. This caused incorrect `averagePurchasePrice` calculations.

**Form Field Mapping (WRONG):**
- "In Store Qty" → `quantity` field
- "Unit Purchased Price" → `totalPurchaseCost` field (should be total cost, not unit price)

**API Calculation (WRONG):**
```typescript
averagePurchasePrice: body.quantity > 0 ? (body.totalPurchaseCost || 0) / body.quantity : 0
```
This divided the unit price by quantity, resulting in incorrect average purchase price.

### Root Causes
1. **Bulk Storage Valuation:** Uses `totalInvestment` (lifetime cumulative) instead of current asset value
2. **Form Field Confusion:** "Unit Purchased Price" field actually stores total cost, not unit price
3. **API Logic:** Divides unit price by quantity, causing incorrect calculations

## Bug Condition Methodology

### Bug Condition Function
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type StockItem[]
  OUTPUT: boolean
  
  // Bug occurs when calculating bulk storage value using totalInvestment
  // instead of current storeQuantity × averagePurchasePrice
  RETURN TRUE  // Bug is always present in current code
END FUNCTION
```

### Property Specification - Fix Checking

**Property 1: Correct Calculation Formula**
```pascal
// Property: Bulk Storage Value Calculation
FOR ALL items IN stockItems DO
  expectedValue ← item.storeQuantity × item.averagePurchasePrice
  actualValue ← contribution to totalStats.storeValue
  ASSERT actualValue = expectedValue
END FOR
```

**Property 2: Zero Quantity Handling**
```pascal
// Property: Zero Quantity Items
FOR ALL items WHERE item.storeQuantity = 0 DO
  contribution ← item's contribution to totalStats.storeValue
  ASSERT contribution = 0
END FOR
```

**Property 3: Total Aggregation**
```pascal
// Property: Correct Aggregation
totalStoreValue ← totalStats.storeValue
expectedTotal ← SUM(item.storeQuantity × item.averagePurchasePrice) for all items
ASSERT totalStoreValue = expectedTotal
```

### Preservation Goal - Preservation Checking

**Property 4: Individual Item Display Unchanged**
```pascal
// Property: Item Table Display Preservation
FOR ALL items IN inventory table DO
  displayedValue ← "Total Store Value (Br)" column
  expectedValue ← item.storeQuantity × item.averagePurchasePrice
  ASSERT displayedValue = expectedValue
END FOR
```

**Property 5: Transfer Operations Unchanged**
```pascal
// Property: Transfer Logic Preservation
WHEN transferring quantity Q from store to active stock DO
  newStoreQuantity ← item.storeQuantity - Q
  newActiveQuantity ← item.quantity + Q
  ASSERT newStoreQuantity ≥ 0
  ASSERT newActiveQuantity ≥ 0
  ASSERT totalInvestment unchanged
END WHEN
```

**Property 6: Restock Operations Unchanged**
```pascal
// Property: Restock Logic Preservation
WHEN restocking with quantity Q and cost C DO
  newStoreQuantity ← item.storeQuantity + Q
  newTotalInvestment ← item.totalInvestment + C
  newAveragePurchasePrice ← newTotalInvestment / (totalPurchased + Q)
  ASSERT newStoreQuantity > 0
  ASSERT newTotalInvestment > 0
END WHEN
```

## Correctness Properties

### Test Case 1: Single Item with Store Quantity
**Input:**
- Item: "7 up"
- storeQuantity: 10
- averagePurchasePrice: 10
- totalInvestment: 500 (from previous restocks)

**Expected Output:**
- storeValue contribution: 10 × 10 = 100 ETB
- NOT 500 ETB (which is totalInvestment)

### Test Case 2: Multiple Items
**Input:**
- Item 1: storeQuantity=5, averagePurchasePrice=20, totalInvestment=200
- Item 2: storeQuantity=10, averagePurchasePrice=15, totalInvestment=300
- Item 3: storeQuantity=0, averagePurchasePrice=50, totalInvestment=100

**Expected Output:**
- Total storeValue: (5×20) + (10×15) + (0×50) = 100 + 150 + 0 = 250 ETB
- NOT 200 + 300 + 100 = 600 ETB (which is sum of totalInvestment)

### Test Case 3: After Transfer
**Input:**
- Item: storeQuantity=10, averagePurchasePrice=10, totalInvestment=100
- Transfer 5 units to active stock

**Expected Output:**
- New storeQuantity: 5
- New storeValue contribution: 5 × 10 = 50 ETB
- totalInvestment: UNCHANGED at 100 ETB (for historical tracking)

## Implementation Plan

### Change 1: Fix Bulk Storage Valuation
**File:** `app/admin/store/page.tsx`  
**Line:** 1016

**Current:**
```typescript
const totalStats = {
    storeValue: stockItems.reduce((sum, item) => sum + (item.totalInvestment || 0), 0),
    totalItems: stockItems.length,
    fixedAssetValue: fixedAssets.reduce((sum, a) => sum + (a.totalValue || 0), 0),
    fixedAssetCount: fixedAssets.length
}
```

**Fixed:**
```typescript
const totalStats = {
    storeValue: stockItems.filter(item => (item.storeQuantity ?? 0) > 0).reduce((sum, item) => {
        const storeQty = item.storeQuantity ?? 0
        const unitPrice = item.averagePurchasePrice ?? 0
        return sum + (storeQty * unitPrice)
    }, 0),
    totalStoreInvestment: stockItems.filter(item => (item.storeQuantity ?? 0) > 0).reduce((sum, item) => sum + (item.totalInvestment || 0), 0),
    totalItems: stockItems.length,
    fixedAssetValue: fixedAssets.reduce((sum, a) => sum + (a.totalValue || 0), 0),
    fixedAssetCount: fixedAssets.length
}
```

### Change 2: Fix Form Field for Unit Purchased Price
**File:** `app/admin/store/page.tsx`  
**Form State:** `stockFormData`

**Current (WRONG):**
```typescript
const [stockFormData, setStockFormData] = useState({
    // ...
    totalPurchaseCost: "", // Labeled as "Unit Purchased Price" but stores total cost
    // ...
})
```

**Fixed:**
```typescript
const [stockFormData, setStockFormData] = useState({
    // ...
    unitPurchasedPrice: "", // Correctly stores unit price
    // ...
})
```

**Form Input (Line 1694):**
```typescript
// OLD: value={stockFormData.totalPurchaseCost}
// NEW: value={stockFormData.unitPurchasedPrice}
```

### Change 3: Fix handleSaveStock Calculation
**File:** `app/admin/store/page.tsx`  
**Function:** `handleSaveStock`

**Current (WRONG):**
```typescript
const payload = {
    // ...
    totalPurchaseCost: totalPurchaseCost === "" ? undefined : Number(totalPurchaseCost),
}
```

**Fixed:**
```typescript
const qty = quantity === "" ? 0 : Number(quantity)
const unitPrice = unitPurchasedPrice === "" ? 0 : Number(unitPurchasedPrice)
const totalCost = qty * unitPrice // Calculate total cost from quantity and unit price

const payload = {
    // ...
    totalPurchaseCost: totalCost || undefined,
    quantity: qty || undefined,
}
```

### Change 4: Fix handleEditStock to Extract Unit Price
**File:** `app/admin/store/page.tsx`  
**Function:** `handleEditStock`

**Current (WRONG):**
```typescript
totalPurchaseCost: item.totalInvestment?.toString() || "",
```

**Fixed:**
```typescript
const unitPrice = item.totalPurchased > 0 ? (item.totalInvestment || 0) / item.totalPurchased : 0
// ...
unitPurchasedPrice: unitPrice.toString() || "",
```

### Why These Fixes Work
1. **Bulk Storage Valuation:** Uses `storeQuantity × averagePurchasePrice` for current asset value
2. **Form Field:** Correctly captures unit price, not total cost
3. **Calculation:** Multiplies quantity by unit price to get total cost
4. **Edit Mode:** Extracts unit price from historical data for editing
5. **Filtering:** Only includes items with actual storeQuantity > 0

### Verification
After the fix:
- The "VALUE OF BULK STORAGE" will show the current asset value of items in bulk storage
- Individual item values in the table will remain unchanged (they already use correct formula)
- Transfer and restock operations will continue to work correctly
- Historical tracking via `totalInvestment` is preserved for other uses
