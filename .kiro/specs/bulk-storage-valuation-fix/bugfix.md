# Bugfix Requirements Document

## Introduction

The "VALUE OF BULK STORAGE" calculation on the Store Valuation page is currently displaying an incorrect value (1,029,580.95 ETB). The calculation is using the lifetime total investment (`totalInvestment`) instead of calculating the current bulk storage value based on the actual quantity in store multiplied by the unit purchased price. This results in an inflated and inaccurate representation of the current bulk storage asset value.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Store Valuation page loads THEN the system displays the "VALUE OF BULK STORAGE" by summing `totalInvestment` from all stock items, which represents lifetime cumulative investment rather than current bulk storage value

1.2 WHEN a store item has been restocked multiple times THEN the system includes all historical investment amounts in the bulk storage valuation, even though some of that stock may have been transferred to active stock or consumed

1.3 WHEN viewing the bulk storage value THEN the system does not account for the actual quantity currently in store (`storeQuantity`), resulting in a value that doesn't reflect the current inventory state

### Expected Behavior (Correct)

2.1 WHEN the Store Valuation page loads THEN the system SHALL calculate "VALUE OF BULK STORAGE" as the sum of (unit_purchased_price × in_store_qty) for each store item

2.2 WHEN calculating bulk storage value for each item THEN the system SHALL use `storeQuantity` (current quantity in bulk storage) multiplied by `averagePurchasePrice` (unit purchased price)

2.3 WHEN a store item has zero quantity in bulk storage THEN the system SHALL contribute zero to the total bulk storage valuation

2.4 WHEN the bulk storage value is calculated THEN the system SHALL only reflect the current asset value of items physically in bulk storage, not historical investment

### Unchanged Behavior (Regression Prevention)

3.1 WHEN viewing individual store items in the inventory table THEN the system SHALL CONTINUE TO display the correct "Total Store Value (Br)" for each item using the formula: storeQuantity × averagePurchasePrice

3.2 WHEN transferring items from bulk storage to active stock THEN the system SHALL CONTINUE TO correctly update both `storeQuantity` and `quantity` fields

3.3 WHEN restocking items THEN the system SHALL CONTINUE TO correctly update `totalInvestment`, `totalPurchased`, and `averagePurchasePrice` fields for historical tracking

3.4 WHEN viewing fixed assets and operational expenses THEN the system SHALL CONTINUE TO display their values correctly without any changes

3.5 WHEN calculating total asset value across the system THEN the system SHALL CONTINUE TO use `totalInvestment` for lifetime investment reporting in other contexts
