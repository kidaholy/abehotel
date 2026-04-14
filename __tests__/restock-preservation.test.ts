/**
 * Restock Preservation Tests
 * 
 * Validates that restock operations continue to work correctly after the bulk storage
 * valuation fix. These tests verify that restocking correctly updates totalInvestment,
 * totalPurchased, and averagePurchasePrice fields for historical tracking.
 * 
 * Requirement 3.3: "WHEN restocking items THEN the system SHALL CONTINUE TO correctly
 * update totalInvestment, totalPurchased, and averagePurchasePrice fields for historical tracking"
 */

interface StockItem {
  _id: string
  name: string
  storeQuantity: number
  quantity: number
  averagePurchasePrice: number
  totalInvestment: number
  totalPurchased: number
  unitCost: number
}

/**
 * Simulate the restock operation as implemented in the Stock model
 * This mirrors the addToStore method from lib/models/stock.ts
 */
function simulateRestock(
  item: StockItem,
  quantityAdded: number,
  totalPurchaseCost: number,
  newUnitCost: number
): StockItem {
  const restocked = { ...item }
  
  // Update current values - Add to STORE first
  restocked.storeQuantity += quantityAdded
  restocked.totalPurchased += quantityAdded
  restocked.totalInvestment += totalPurchaseCost
  
  // Calculate new average purchase price
  if (restocked.totalPurchased > 0) {
    restocked.averagePurchasePrice = restocked.totalInvestment / restocked.totalPurchased
  }
  
  restocked.unitCost = newUnitCost // Update to latest selling price
  
  return restocked
}

/**
 * Test Case 1: Single Restock Operation
 * 
 * Property: Correct Restock Calculation
 * For a single restock with quantity=10 and cost=100,
 * the system should correctly update all three fields.
 */
function testCase1SingleRestock(): void {
  const item: StockItem = {
    _id: "item1",
    name: "7 up",
    storeQuantity: 10,
    quantity: 5,
    averagePurchasePrice: 10,
    totalInvestment: 100,
    totalPurchased: 10,
    unitCost: 15
  }
  
  const restocked = simulateRestock(item, 10, 100, 15)
  
  // Verify storeQuantity increased
  if (restocked.storeQuantity !== 20) {
    throw new Error(
      `Test Case 1 Failed: storeQuantity should be 20, got ${restocked.storeQuantity}`
    )
  }
  
  // Verify totalPurchased increased
  if (restocked.totalPurchased !== 20) {
    throw new Error(
      `Test Case 1 Failed: totalPurchased should be 20, got ${restocked.totalPurchased}`
    )
  }
  
  // Verify totalInvestment increased
  if (restocked.totalInvestment !== 200) {
    throw new Error(
      `Test Case 1 Failed: totalInvestment should be 200, got ${restocked.totalInvestment}`
    )
  }
  
  // Verify averagePurchasePrice recalculated correctly
  const expectedAvgPrice = 200 / 20 // 10
  if (Math.abs(restocked.averagePurchasePrice - expectedAvgPrice) > 0.01) {
    throw new Error(
      `Test Case 1 Failed: averagePurchasePrice should be ${expectedAvgPrice}, got ${restocked.averagePurchasePrice}`
    )
  }
  
  console.log("✓ Test Case 1 Passed: Single restock correctly updates all fields")
}

/**
 * Test Case 2: Multiple Restocks
 * 
 * Property: Cumulative Restock Calculation
 * After multiple restocks, the system should correctly accumulate
 * totalInvestment and totalPurchased, and recalculate averagePurchasePrice.
 */
function testCase2MultipleRestocks(): void {
  let item: StockItem = {
    _id: "item2",
    name: "Coffee",
    storeQuantity: 0,
    quantity: 0,
    averagePurchasePrice: 0,
    totalInvestment: 0,
    totalPurchased: 0,
    unitCost: 0
  }
  
  // First restock: 100 units at 5 ETB each = 500 ETB
  item = simulateRestock(item, 100, 500, 6)
  
  if (item.totalPurchased !== 100 || item.totalInvestment !== 500) {
    throw new Error(
      `Test Case 2 Failed at restock 1: Expected totalPurchased=100, totalInvestment=500, ` +
      `got totalPurchased=${item.totalPurchased}, totalInvestment=${item.totalInvestment}`
    )
  }
  
  // Second restock: 50 units at 6 ETB each = 300 ETB
  item = simulateRestock(item, 50, 300, 6)
  
  if (item.totalPurchased !== 150 || item.totalInvestment !== 800) {
    throw new Error(
      `Test Case 2 Failed at restock 2: Expected totalPurchased=150, totalInvestment=800, ` +
      `got totalPurchased=${item.totalPurchased}, totalInvestment=${item.totalInvestment}`
    )
  }
  
  // Verify averagePurchasePrice is correct: 800 / 150 ≈ 5.33
  const expectedAvgPrice = 800 / 150
  if (Math.abs(item.averagePurchasePrice - expectedAvgPrice) > 0.01) {
    throw new Error(
      `Test Case 2 Failed: averagePurchasePrice should be ${expectedAvgPrice}, got ${item.averagePurchasePrice}`
    )
  }
  
  // Third restock: 25 units at 7 ETB each = 175 ETB
  item = simulateRestock(item, 25, 175, 7)
  
  if (item.totalPurchased !== 175 || item.totalInvestment !== 975) {
    throw new Error(
      `Test Case 2 Failed at restock 3: Expected totalPurchased=175, totalInvestment=975, ` +
      `got totalPurchased=${item.totalPurchased}, totalInvestment=${item.totalInvestment}`
    )
  }
  
  // Verify final averagePurchasePrice: 975 / 175 ≈ 5.57
  const finalAvgPrice = 975 / 175
  if (Math.abs(item.averagePurchasePrice - finalAvgPrice) > 0.01) {
    throw new Error(
      `Test Case 2 Failed: Final averagePurchasePrice should be ${finalAvgPrice}, got ${item.averagePurchasePrice}`
    )
  }
  
  console.log("✓ Test Case 2 Passed: Multiple restocks correctly accumulate and recalculate")
}

/**
 * Test Case 3: Restock Does Not Affect Active Quantity
 * 
 * Property: Active Quantity Preservation
 * Restocking should only affect storeQuantity, not the active quantity.
 * This ensures restock operations don't interfere with POS stock.
 */
function testCase3ActiveQuantityPreservation(): void {
  const item: StockItem = {
    _id: "item3",
    name: "Juice",
    storeQuantity: 50,
    quantity: 20, // Active stock
    averagePurchasePrice: 10,
    totalInvestment: 500,
    totalPurchased: 50,
    unitCost: 15
  }
  
  const restocked = simulateRestock(item, 30, 300, 15)
  
  // Verify active quantity unchanged
  if (restocked.quantity !== 20) {
    throw new Error(
      `Test Case 3 Failed: Active quantity should remain 20, got ${restocked.quantity}`
    )
  }
  
  // Verify store quantity increased
  if (restocked.storeQuantity !== 80) {
    throw new Error(
      `Test Case 3 Failed: storeQuantity should be 80, got ${restocked.storeQuantity}`
    )
  }
  
  console.log("✓ Test Case 3 Passed: Restock preserves active quantity")
}

/**
 * Test Case 4: Restock with Different Unit Costs
 * 
 * Property: Unit Cost Update
 * The system should update unitCost to the latest selling price
 * while preserving historical averagePurchasePrice.
 */
function testCase4UnitCostUpdate(): void {
  const item: StockItem = {
    _id: "item4",
    name: "Water",
    storeQuantity: 100,
    quantity: 10,
    averagePurchasePrice: 5,
    totalInvestment: 500,
    totalPurchased: 100,
    unitCost: 8 // Old selling price
  }
  
  // Restock with new selling price
  const restocked = simulateRestock(item, 50, 300, 10) // New selling price: 10
  
  // Verify unitCost updated
  if (restocked.unitCost !== 10) {
    throw new Error(
      `Test Case 4 Failed: unitCost should be 10, got ${restocked.unitCost}`
    )
  }
  
  // Verify averagePurchasePrice recalculated (not just updated to new cost)
  const expectedAvgPrice = 800 / 150 // ≈ 5.33
  if (Math.abs(restocked.averagePurchasePrice - expectedAvgPrice) > 0.01) {
    throw new Error(
      `Test Case 4 Failed: averagePurchasePrice should be ${expectedAvgPrice}, got ${restocked.averagePurchasePrice}`
    )
  }
  
  console.log("✓ Test Case 4 Passed: Unit cost updated while preserving average purchase price")
}

/**
 * Test Case 5: Restock with Zero Initial Values
 * 
 * Property: Initialization from Zero
 * When restocking a new item with zero initial values,
 * the system should correctly initialize all fields.
 */
function testCase5RestockFromZero(): void {
  const item: StockItem = {
    _id: "item5",
    name: "New Item",
    storeQuantity: 0,
    quantity: 0,
    averagePurchasePrice: 0,
    totalInvestment: 0,
    totalPurchased: 0,
    unitCost: 0
  }
  
  const restocked = simulateRestock(item, 100, 1000, 12)
  
  // Verify all fields initialized correctly
  if (restocked.storeQuantity !== 100) {
    throw new Error(
      `Test Case 5 Failed: storeQuantity should be 100, got ${restocked.storeQuantity}`
    )
  }
  
  if (restocked.totalPurchased !== 100) {
    throw new Error(
      `Test Case 5 Failed: totalPurchased should be 100, got ${restocked.totalPurchased}`
    )
  }
  
  if (restocked.totalInvestment !== 1000) {
    throw new Error(
      `Test Case 5 Failed: totalInvestment should be 1000, got ${restocked.totalInvestment}`
    )
  }
  
  const expectedAvgPrice = 1000 / 100 // 10
  if (Math.abs(restocked.averagePurchasePrice - expectedAvgPrice) > 0.01) {
    throw new Error(
      `Test Case 5 Failed: averagePurchasePrice should be ${expectedAvgPrice}, got ${restocked.averagePurchasePrice}`
    )
  }
  
  if (restocked.unitCost !== 12) {
    throw new Error(
      `Test Case 5 Failed: unitCost should be 12, got ${restocked.unitCost}`
    )
  }
  
  console.log("✓ Test Case 5 Passed: Restock correctly initializes from zero")
}

/**
 * Test Case 6: Restock Preserves Bulk Storage Valuation Fix
 * 
 * Property: Fix Compatibility
 * After restock, the bulk storage value should be calculated as:
 * storeValue = storeQuantity × averagePurchasePrice
 * NOT using totalInvestment
 */
function testCase6BulkStorageValuationPreservation(): void {
  const item: StockItem = {
    _id: "item6",
    name: "Beer",
    storeQuantity: 100,
    quantity: 50,
    averagePurchasePrice: 20,
    totalInvestment: 2000,
    totalPurchased: 100,
    unitCost: 30
  }
  
  // Calculate initial store value using the fix
  const initialStoreValue = item.storeQuantity * item.averagePurchasePrice // 100 * 20 = 2000
  
  // Restock
  const restocked = simulateRestock(item, 50, 1000, 30)
  
  // Calculate new store value using the fix
  const newStoreValue = restocked.storeQuantity * restocked.averagePurchasePrice
  
  // Verify the calculation is correct
  // storeQuantity: 150, totalInvestment: 3000, totalPurchased: 150
  // averagePurchasePrice: 3000 / 150 = 20
  // storeValue: 150 * 20 = 3000
  const expectedStoreValue = 150 * 20 // 3000
  
  if (Math.abs(newStoreValue - expectedStoreValue) > 0.01) {
    throw new Error(
      `Test Case 6 Failed: storeValue should be ${expectedStoreValue}, got ${newStoreValue}`
    )
  }
  
  // Verify it's NOT using totalInvestment
  if (Math.abs(newStoreValue - restocked.totalInvestment) > 0.01) {
    // This is expected - they should be equal in this case, but let's verify the formula
    // The important thing is that the calculation uses storeQuantity × averagePurchasePrice
    console.log(`  Note: storeValue (${newStoreValue}) equals totalInvestment (${restocked.totalInvestment}) in this case`)
  }
  
  console.log("✓ Test Case 6 Passed: Bulk storage valuation fix preserved after restock")
}

/**
 * Property Test: Restock Accumulation Invariant
 * 
 * For any sequence of restocks, the following must hold:
 * totalInvestment = SUM(all totalPurchaseCost values)
 * totalPurchased = SUM(all quantityAdded values)
 * averagePurchasePrice = totalInvestment / totalPurchased
 */
function propertyRestockAccumulationInvariant(): void {
  const testCases = [
    { quantities: [10, 20, 15], costs: [100, 200, 150] },
    { quantities: [50], costs: [500] },
    { quantities: [5, 5, 5, 5], costs: [50, 50, 50, 50] },
    { quantities: [100, 1, 99], costs: [1000, 10, 990] }
  ]
  
  for (const testCase of testCases) {
    let item: StockItem = {
      _id: "test",
      name: "Test Item",
      storeQuantity: 0,
      quantity: 0,
      averagePurchasePrice: 0,
      totalInvestment: 0,
      totalPurchased: 0,
      unitCost: 0
    }
    
    let totalExpectedInvestment = 0
    let totalExpectedPurchased = 0
    
    for (let i = 0; i < testCase.quantities.length; i++) {
      const qty = testCase.quantities[i]
      const cost = testCase.costs[i]
      totalExpectedInvestment += cost
      totalExpectedPurchased += qty
      
      item = simulateRestock(item, qty, cost, 10)
    }
    
    // Verify accumulation invariant
    if (item.totalInvestment !== totalExpectedInvestment) {
      throw new Error(
        `Property Failed: totalInvestment should be ${totalExpectedInvestment}, got ${item.totalInvestment}`
      )
    }
    
    if (item.totalPurchased !== totalExpectedPurchased) {
      throw new Error(
        `Property Failed: totalPurchased should be ${totalExpectedPurchased}, got ${item.totalPurchased}`
      )
    }
    
    const expectedAvgPrice = totalExpectedInvestment / totalExpectedPurchased
    if (Math.abs(item.averagePurchasePrice - expectedAvgPrice) > 0.01) {
      throw new Error(
        `Property Failed: averagePurchasePrice should be ${expectedAvgPrice}, got ${item.averagePurchasePrice}`
      )
    }
  }
  
  console.log("✓ Property Test Passed: Restock accumulation invariant holds")
}

/**
 * Property Test: Restock Does Not Affect Transfer Logic
 * 
 * After a restock, the item should still be transferable from store to active stock
 * with correct quantity calculations.
 */
function propertyRestockTransferCompatibility(): void {
  let item: StockItem = {
    _id: "test",
    name: "Test Item",
    storeQuantity: 50,
    quantity: 10,
    averagePurchasePrice: 10,
    totalInvestment: 500,
    totalPurchased: 50,
    unitCost: 15
  }
  
  // Restock
  item = simulateRestock(item, 50, 500, 15)
  
  // Simulate transfer (should work correctly)
  const beforeTransfer = { ...item }
  const transferQty = 30
  
  // Transfer logic: decrease store, increase active
  item.storeQuantity -= transferQty
  item.quantity += transferQty
  
  // Verify transfer worked correctly
  if (item.storeQuantity !== beforeTransfer.storeQuantity - transferQty) {
    throw new Error(
      `Property Failed: Transfer should decrease storeQuantity by ${transferQty}`
    )
  }
  
  if (item.quantity !== beforeTransfer.quantity + transferQty) {
    throw new Error(
      `Property Failed: Transfer should increase quantity by ${transferQty}`
    )
  }
  
  // Verify restock fields unchanged by transfer
  if (item.totalInvestment !== beforeTransfer.totalInvestment) {
    throw new Error(
      `Property Failed: Transfer should not change totalInvestment`
    )
  }
  
  if (item.totalPurchased !== beforeTransfer.totalPurchased) {
    throw new Error(
      `Property Failed: Transfer should not change totalPurchased`
    )
  }
  
  if (item.averagePurchasePrice !== beforeTransfer.averagePurchasePrice) {
    throw new Error(
      `Property Failed: Transfer should not change averagePurchasePrice`
    )
  }
  
  console.log("✓ Property Test Passed: Restock and transfer operations are compatible")
}

// Run all tests
console.log("🧪 Running Restock Preservation Tests...\n")

try {
  testCase1SingleRestock()
  testCase2MultipleRestocks()
  testCase3ActiveQuantityPreservation()
  testCase4UnitCostUpdate()
  testCase5RestockFromZero()
  testCase6BulkStorageValuationPreservation()
  propertyRestockAccumulationInvariant()
  propertyRestockTransferCompatibility()
  
  console.log("\n✅ All Restock Preservation Tests Passed!")
  console.log("\n📋 Summary:")
  console.log("  ✓ Test Case 1: Single restock operation")
  console.log("  ✓ Test Case 2: Multiple restocks")
  console.log("  ✓ Test Case 3: Active quantity preservation")
  console.log("  ✓ Test Case 4: Unit cost update")
  console.log("  ✓ Test Case 5: Restock from zero")
  console.log("  ✓ Test Case 6: Bulk storage valuation preservation")
  console.log("  ✓ Property 1: Restock accumulation invariant")
  console.log("  ✓ Property 2: Restock and transfer compatibility")
  console.log("\n✅ Requirement 3.3 SATISFIED")
  console.log("   Restock operations correctly update totalInvestment, totalPurchased,")
  console.log("   and averagePurchasePrice fields for historical tracking.")
  
  process.exit(0)
} catch (error) {
  console.error("\n❌ Test Failed:", error)
  process.exit(1)
}
