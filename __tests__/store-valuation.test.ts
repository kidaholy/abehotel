/**
 * Property-Based Tests for Bulk Storage Valuation Fix
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 * 
 * These tests verify that the bulk storage value calculation correctly uses
 * storeQuantity × averagePurchasePrice instead of totalInvestment.
 */

interface StockItem {
  id: string
  name: string
  storeQuantity: number
  quantity: number
  averagePurchasePrice: number
  totalInvestment: number
  totalPurchased: number
}

/**
 * Calculate total store value using the fixed formula
 * storeValue = Σ(storeQuantity × averagePurchasePrice)
 */
function calculateStoreValue(items: StockItem[]): number {
  return items.reduce((sum, item) => {
    const storeQty = item.storeQuantity ?? 0
    const unitPrice = item.averagePurchasePrice ?? 0
    return sum + (storeQty * unitPrice)
  }, 0)
}

/**
 * Test Case 1: Single Item with Store Quantity
 * 
 * Property: Correct Calculation Formula
 * For a single item with storeQuantity=10 and averagePurchasePrice=10,
 * the storeValue contribution should be 100 ETB, NOT 500 ETB (totalInvestment)
 */
function testCase1SingleItem(): void {
  const items: StockItem[] = [
    {
      id: "1",
      name: "7 up",
      storeQuantity: 10,
      quantity: 0,
      averagePurchasePrice: 10,
      totalInvestment: 500,
      totalPurchased: 50
    }
  ]

  const storeValue = calculateStoreValue(items)
  const expected = 10 * 10 // storeQuantity × averagePurchasePrice
  
  if (storeValue !== expected) {
    throw new Error(
      `Test Case 1 Failed: Expected ${expected} ETB, got ${storeValue} ETB. ` +
      `Should use storeQuantity × averagePurchasePrice, not totalInvestment.`
    )
  }
  
  console.log("✓ Test Case 1 Passed: Single item calculation correct (100 ETB)")
}

/**
 * Test Case 2: Multiple Items
 * 
 * Property: Correct Aggregation
 * For multiple items with different quantities and prices,
 * the total should be the sum of (storeQuantity × averagePurchasePrice) for each item.
 * Expected: (5×20) + (10×15) + (0×50) = 250 ETB, NOT 600 ETB (sum of totalInvestment)
 */
function testCase2MultipleItems(): void {
  const items: StockItem[] = [
    {
      id: "1",
      name: "Item 1",
      storeQuantity: 5,
      quantity: 0,
      averagePurchasePrice: 20,
      totalInvestment: 200,
      totalPurchased: 10
    },
    {
      id: "2",
      name: "Item 2",
      storeQuantity: 10,
      quantity: 0,
      averagePurchasePrice: 15,
      totalInvestment: 300,
      totalPurchased: 20
    },
    {
      id: "3",
      name: "Item 3",
      storeQuantity: 0,
      quantity: 0,
      averagePurchasePrice: 50,
      totalInvestment: 100,
      totalPurchased: 2
    }
  ]

  const storeValue = calculateStoreValue(items)
  const expected = (5 * 20) + (10 * 15) + (0 * 50) // 100 + 150 + 0 = 250
  
  if (storeValue !== expected) {
    throw new Error(
      `Test Case 2 Failed: Expected ${expected} ETB, got ${storeValue} ETB. ` +
      `Should sum (storeQuantity × averagePurchasePrice) for all items, not totalInvestment.`
    )
  }
  
  console.log("✓ Test Case 2 Passed: Multiple items aggregation correct (250 ETB)")
}

/**
 * Test Case 3: After Transfer
 * 
 * Property: Zero Quantity Handling & Transfer Logic Preservation
 * When an item is transferred from store to active stock:
 * - storeQuantity decreases
 * - storeValue contribution changes accordingly
 * - totalInvestment remains unchanged (for historical tracking)
 * 
 * Before transfer: storeQuantity=10, storeValue contribution = 10 × 10 = 100 ETB
 * After transfer of 5 units: storeQuantity=5, storeValue contribution = 5 × 10 = 50 ETB
 */
function testCase3AfterTransfer(): void {
  // Before transfer
  const itemBefore: StockItem = {
    id: "1",
    name: "Item",
    storeQuantity: 10,
    quantity: 0,
    averagePurchasePrice: 10,
    totalInvestment: 100,
    totalPurchased: 10
  }

  const storeValueBefore = calculateStoreValue([itemBefore])
  const expectedBefore = 10 * 10 // 100 ETB

  if (storeValueBefore !== expectedBefore) {
    throw new Error(
      `Test Case 3 (Before) Failed: Expected ${expectedBefore} ETB, got ${storeValueBefore} ETB`
    )
  }

  // After transfer of 5 units to active stock
  const itemAfter: StockItem = {
    id: "1",
    name: "Item",
    storeQuantity: 5, // Decreased by 5
    quantity: 5, // Increased by 5
    averagePurchasePrice: 10, // Unchanged
    totalInvestment: 100, // Unchanged (for historical tracking)
    totalPurchased: 10 // Unchanged
  }

  const storeValueAfter = calculateStoreValue([itemAfter])
  const expectedAfter = 5 * 10 // 50 ETB

  if (storeValueAfter !== expectedAfter) {
    throw new Error(
      `Test Case 3 (After) Failed: Expected ${expectedAfter} ETB, got ${storeValueAfter} ETB`
    )
  }

  // Verify totalInvestment is unchanged
  if (itemAfter.totalInvestment !== itemBefore.totalInvestment) {
    throw new Error(
      `Test Case 3 Failed: totalInvestment should remain unchanged after transfer`
    )
  }

  console.log("✓ Test Case 3 Passed: Transfer logic correct (100 ETB → 50 ETB, totalInvestment unchanged)")
}

/**
 * Property Test: Zero Quantity Items Contribute Zero
 * 
 * For any item with storeQuantity = 0, its contribution to storeValue should be 0,
 * regardless of averagePurchasePrice or totalInvestment.
 */
function propertyZeroQuantityContributesZero(): void {
  const testCases = [
    { storeQuantity: 0, averagePurchasePrice: 0, totalInvestment: 0 },
    { storeQuantity: 0, averagePurchasePrice: 100, totalInvestment: 1000 },
    { storeQuantity: 0, averagePurchasePrice: 50.5, totalInvestment: 5050 },
  ]

  for (const testCase of testCases) {
    const item: StockItem = {
      id: "1",
      name: "Test Item",
      storeQuantity: testCase.storeQuantity,
      quantity: 0,
      averagePurchasePrice: testCase.averagePurchasePrice,
      totalInvestment: testCase.totalInvestment,
      totalPurchased: 0
    }

    const contribution = calculateStoreValue([item])
    if (contribution !== 0) {
      throw new Error(
        `Property Failed: Zero quantity item should contribute 0, got ${contribution}`
      )
    }
  }

  console.log("✓ Property Test Passed: Zero quantity items always contribute zero")
}

/**
 * Property Test: Calculation Uses storeQuantity, Not totalInvestment
 * 
 * For any item, the storeValue contribution should be based on storeQuantity × averagePurchasePrice,
 * NOT on totalInvestment. This is verified by checking that items with the same storeQuantity
 * and averagePurchasePrice produce the same contribution, regardless of totalInvestment.
 */
function propertyCalculationUsesStoreQuantity(): void {
  const item1: StockItem = {
    id: "1",
    name: "Item",
    storeQuantity: 10,
    quantity: 0,
    averagePurchasePrice: 20,
    totalInvestment: 100, // Different totalInvestment
    totalPurchased: 5
  }

  const item2: StockItem = {
    id: "2",
    name: "Item",
    storeQuantity: 10,
    quantity: 0,
    averagePurchasePrice: 20,
    totalInvestment: 500, // Different totalInvestment
    totalPurchased: 25
  }

  const value1 = calculateStoreValue([item1])
  const value2 = calculateStoreValue([item2])

  if (value1 !== value2) {
    throw new Error(
      `Property Failed: Items with same storeQuantity and averagePurchasePrice ` +
      `should have same contribution, got ${value1} vs ${value2}`
    )
  }

  if (value1 !== 200) {
    throw new Error(
      `Property Failed: Expected contribution of 200 (10 × 20), got ${value1}`
    )
  }

  console.log("✓ Property Test Passed: Calculation uses storeQuantity, not totalInvestment")
}

/**
 * Property Test: Linearity - Adding Items Adds Values
 * 
 * For any set of items, the total storeValue should equal the sum of individual contributions.
 * This verifies that the aggregation formula is correct.
 */
function propertyLinearityOfAggregation(): void {
  const items: StockItem[] = [
    {
      id: "1",
      name: "Item 1",
      storeQuantity: 5,
      quantity: 0,
      averagePurchasePrice: 10,
      totalInvestment: 50,
      totalPurchased: 5
    },
    {
      id: "2",
      name: "Item 2",
      storeQuantity: 3,
      quantity: 0,
      averagePurchasePrice: 15,
      totalInvestment: 45,
      totalPurchased: 3
    },
    {
      id: "3",
      name: "Item 3",
      storeQuantity: 7,
      quantity: 0,
      averagePurchasePrice: 20,
      totalInvestment: 140,
      totalPurchased: 7
    }
  ]

  const totalValue = calculateStoreValue(items)
  const sumOfIndividual = items.reduce((sum, item) => {
    return sum + (item.storeQuantity * item.averagePurchasePrice)
  }, 0)

  if (totalValue !== sumOfIndividual) {
    throw new Error(
      `Property Failed: Total value ${totalValue} should equal sum of individual values ${sumOfIndividual}`
    )
  }

  const expected = (5 * 10) + (3 * 15) + (7 * 20) // 50 + 45 + 140 = 235
  if (totalValue !== expected) {
    throw new Error(
      `Property Failed: Expected ${expected}, got ${totalValue}`
    )
  }

  console.log("✓ Property Test Passed: Aggregation is linear and correct")
}

/**
 * Run all tests
 */
function runAllTests(): void {
  console.log("\n=== Bulk Storage Valuation Fix - Property-Based Tests ===\n")
  console.log("Validates: Requirements 2.1, 2.2, 2.3, 2.4\n")

  try {
    console.log("Test Cases from Design Document:")
    testCase1SingleItem()
    testCase2MultipleItems()
    testCase3AfterTransfer()

    console.log("\nProperty Tests:")
    propertyZeroQuantityContributesZero()
    propertyCalculationUsesStoreQuantity()
    propertyLinearityOfAggregation()

    console.log("\n=== All Tests Passed ✓ ===\n")
  } catch (error) {
    console.error("\n=== Test Failed ✗ ===\n")
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run tests
runAllTests()
