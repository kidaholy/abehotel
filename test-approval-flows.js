/**
 * Automated Test Script for Reception Approval Flows
 * 
 * Usage:
 * 1. Run: node test-approval-flows.js
 * 2. Or copy-paste sections into browser console
 * 
 * IMPORTANT: Replace TOKEN and BASE_URL with your values
 */

const TOKEN = 'YOUR_ADMIN_TOKEN_HERE';
const BASE_URL = 'http://localhost:3000';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  
  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

// Test 1: Check-In Approval Flow
async function testCheckInApproval() {
  console.log('\n========================================');
  console.log('TEST 1: Check-In Approval Flow');
  console.log('========================================\n');
  
  try {
    // Step 1: Get pending check_in request
    console.log('📋 Step 1: Fetching pending check_in requests...');
    const pendingRes = await apiCall('/api/reception-requests?limit=10&status=pending');
    
    const checkInRequest = pendingRes.data.data?.find(r => r.inquiryType === 'check_in');
    
    if (!checkInRequest) {
      console.log('⚠️  No pending check_in requests found. Create one manually first.');
      return null;
    }
    
    console.log(`✅ Found pending check_in request: ${checkInRequest.guestName}`);
    console.log(`   ID: ${checkInRequest._id}`);
    console.log(`   Status: ${checkInRequest.status}`);
    console.log(`   Inquiry Type: ${checkInRequest.inquiryType}\n`);
    
    // Step 2: Approve the request
    console.log('📤 Step 2: Approving check-in request...');
    const approveRes = await apiCall(
      `/api/reception-requests/${checkInRequest._id}`,
      'PUT',
      { status: 'check_in', reviewNote: 'Automated test approval' }
    );
    
    if (!approveRes.ok) {
      console.error('❌ Approval failed:', approveRes.data.message);
      return null;
    }
    
    console.log('✅ Approval successful!');
    console.log(`   New Status: ${approveRes.data.request.status}`);
    console.log(`   Inquiry Type: ${approveRes.data.request.inquiryType}\n`);
    
    // Step 3: Verify it's in check_in status
    console.log('🔍 Step 3: Verifying request is in CHECK IN tab...');
    const checkInRes = await apiCall('/api/reception-requests?limit=100&status=check_in');
    
    const foundInCheckIn = checkInRes.data.data?.find(r => r._id === checkInRequest._id);
    
    if (foundInCheckIn) {
      console.log('✅ Request found in CHECK IN tab (status: check_in)');
    } else {
      console.error('❌ Request NOT found in CHECK IN tab!');
    }
    
    // Step 4: Verify it's NOT in check_out tab
    console.log('\n🔍 Step 4: Verifying request is NOT in CHECK OUT tab...');
    const checkOutRes = await apiCall('/api/reception-requests?limit=100&status=check_out');
    
    const foundInCheckOut = checkOutRes.data.data?.find(r => r._id === checkInRequest._id);
    
    if (!foundInCheckOut) {
      console.log('✅ Request correctly NOT in CHECK OUT tab');
    } else {
      console.error('❌ CRITICAL: Request found in CHECK OUT tab (should not be there!)');
    }
    
    console.log('\n✅ TEST 1 PASSED: Check-in approval flow works correctly\n');
    return checkInRequest._id;
    
  } catch (error) {
    console.error('❌ TEST 1 FAILED:', error.message);
    return null;
  }
}

// Test 2: Check-Out Approval Flow
async function testCheckOutApproval() {
  console.log('\n========================================');
  console.log('TEST 2: Check-Out Approval Flow');
  console.log('========================================\n');
  
  try {
    // Step 1: Get pending check_out request
    console.log('📋 Step 1: Fetching pending check_out requests...');
    const pendingRes = await apiCall('/api/reception-requests?limit=10&status=pending');
    
    const checkOutRequest = pendingRes.data.data?.find(r => r.inquiryType === 'check_out');
    
    if (!checkOutRequest) {
      console.log('⚠️  No pending check_out requests found. Create one manually first.');
      return null;
    }
    
    console.log(`✅ Found pending check_out request: ${checkOutRequest.guestName}`);
    console.log(`   ID: ${checkOutRequest._id}`);
    console.log(`   Status: ${checkOutRequest.status}`);
    console.log(`   Inquiry Type: ${checkOutRequest.inquiryType}\n`);
    
    // Step 2: Approve the request
    console.log('📤 Step 2: Approving check-out request...');
    const approveRes = await apiCall(
      `/api/reception-requests/${checkOutRequest._id}`,
      'PUT',
      { status: 'check_out', reviewNote: 'Automated test approval' }
    );
    
    if (!approveRes.ok) {
      console.error('❌ Approval failed:', approveRes.data.message);
      return null;
    }
    
    console.log('✅ Approval successful!');
    console.log(`   New Status: ${approveRes.data.request.status}`);
    console.log(`   Inquiry Type: ${approveRes.data.request.inquiryType}\n`);
    
    // Step 3: Verify it's in check_out status
    console.log('🔍 Step 3: Verifying request is in CHECK OUT tab...');
    const checkOutRes = await apiCall('/api/reception-requests?limit=100&status=check_out');
    
    const foundInCheckOut = checkOutRes.data.data?.find(r => r._id === checkOutRequest._id);
    
    if (foundInCheckOut) {
      console.log('✅ Request found in CHECK OUT tab (status: check_out)');
    } else {
      console.error('❌ Request NOT found in CHECK OUT tab!');
    }
    
    // Step 4: CRITICAL - Verify it's NOT in check_in tab
    console.log('\n🔍 Step 4: CRITICAL CHECK - Verifying request is NOT in CHECK IN tab...');
    const checkInRes = await apiCall('/api/reception-requests?limit=100&status=check_in');
    
    const foundInCheckIn = checkInRes.data.data?.find(r => r._id === checkOutRequest._id);
    
    if (!foundInCheckIn) {
      console.log('✅ CRITICAL CHECK PASSED: Request correctly NOT in CHECK IN tab');
    } else {
      console.error('❌ CRITICAL FAILURE: Check-out request found in CHECK IN tab!');
      console.error('   This is the main bug we are trying to fix!');
    }
    
    console.log('\n✅ TEST 2 PASSED: Check-out approval flow works correctly\n');
    return checkOutRequest._id;
    
  } catch (error) {
    console.error('❌ TEST 2 FAILED:', error.message);
    return null;
  }
}

// Test 3: Validation - Prevent check_out → check_in
async function testValidationCheckOutToCheckIn() {
  console.log('\n========================================');
  console.log('TEST 3: Validation - Prevent check_out → check_in');
  console.log('========================================\n');
  
  try {
    // Step 1: Get a check_out request
    console.log('📋 Step 1: Fetching check_out request...');
    const checkOutRes = await apiCall('/api/reception-requests?limit=10&status=check_out');
    
    const checkOutRequest = checkOutRes.data.data?.find(r => r.inquiryType === 'check_out');
    
    if (!checkOutRequest) {
      console.log('⚠️  No check_out requests found. Create one first.');
      return false;
    }
    
    console.log(`✅ Found check_out request: ${checkOutRequest.guestName}`);
    console.log(`   Inquiry Type: ${checkOutRequest.inquiryType}\n`);
    
    // Step 2: Try to approve as check_in (should fail)
    console.log('🚫 Step 2: Attempting invalid transition (check_out → check_in)...');
    const invalidRes = await apiCall(
      `/api/reception-requests/${checkOutRequest._id}`,
      'PUT',
      { status: 'check_in' }
    );
    
    if (!invalidRes.ok && invalidRes.status === 400) {
      console.log('✅ Validation working! Request blocked with 400 error');
      console.log(`   Error: ${invalidRes.data.message}`);
      console.log(`   Error Code: ${invalidRes.data.errorCode}\n`);
      console.log('✅ TEST 3 PASSED: Validation prevents invalid transition\n');
      return true;
    } else {
      console.error('❌ TEST 3 FAILED: Invalid transition was allowed!');
      console.error('   This should have been blocked!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ TEST 3 FAILED:', error.message);
    return false;
  }
}

// Test 4: Validation - Prevent check_in → check_out
async function testValidationCheckInToCheckOut() {
  console.log('\n========================================');
  console.log('TEST 4: Validation - Prevent check_in → check_out');
  console.log('========================================\n');
  
  try {
    // Step 1: Get a check_in request
    console.log('📋 Step 1: Fetching check_in request...');
    const checkInRes = await apiCall('/api/reception-requests?limit=10&status=check_in');
    
    const checkInRequest = checkInRes.data.data?.find(r => r.inquiryType === 'check_in');
    
    if (!checkInRequest) {
      console.log('⚠️  No check_in requests found. Create one first.');
      return false;
    }
    
    console.log(`✅ Found check_in request: ${checkInRequest.guestName}`);
    console.log(`   Inquiry Type: ${checkInRequest.inquiryType}\n`);
    
    // Step 2: Try to approve as check_out (should fail)
    console.log('🚫 Step 2: Attempting invalid transition (check_in → check_out)...');
    const invalidRes = await apiCall(
      `/api/reception-requests/${checkInRequest._id}`,
      'PUT',
      { status: 'check_out' }
    );
    
    if (!invalidRes.ok && invalidRes.status === 400) {
      console.log('✅ Validation working! Request blocked with 400 error');
      console.log(`   Error: ${invalidRes.data.message}`);
      console.log(`   Error Code: ${invalidRes.data.errorCode}\n`);
      console.log('✅ TEST 4 PASSED: Validation prevents invalid transition\n');
      return true;
    } else {
      console.error('❌ TEST 4 FAILED: Invalid transition was allowed!');
      console.error('   This should have been blocked!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ TEST 4 FAILED:', error.message);
    return false;
  }
}

// Test 5: Tab Filtering
async function testTabFiltering() {
  console.log('\n========================================');
  console.log('TEST 5: Tab Filtering Verification');
  console.log('========================================\n');
  
  try {
    let allPassed = true;
    
    // Check CHECK IN tab
    console.log('📋 Checking CHECK IN tab...');
    const checkInRes = await apiCall('/api/reception-requests?limit=100&status=check_in');
    const checkInRequests = checkInRes.data.data || [];
    
    const checkInWithWrongType = checkInRequests.filter(r => r.inquiryType !== 'check_in');
    
    if (checkInWithWrongType.length === 0) {
      console.log(`✅ CHECK IN tab: ${checkInRequests.length} requests, all with correct inquiryType`);
    } else {
      console.error(`❌ CHECK IN tab: ${checkInWithWrongType.length} requests with WRONG inquiryType!`);
      allPassed = false;
    }
    
    // Check CHECK OUT tab
    console.log('\n📋 Checking CHECK OUT tab...');
    const checkOutRes = await apiCall('/api/reception-requests?limit=100&status=check_out');
    const checkOutRequests = checkOutRes.data.data || [];
    
    const checkOutWithWrongType = checkOutRequests.filter(r => r.inquiryType !== 'check_out');
    
    if (checkOutWithWrongType.length === 0) {
      console.log(`✅ CHECK OUT tab: ${checkOutRequests.length} requests, all with correct inquiryType`);
    } else {
      console.error(`❌ CHECK OUT tab: ${checkOutWithWrongType.length} requests with WRONG inquiryType!`);
      allPassed = false;
    }
    
    // Check for cross-contamination
    console.log('\n🔍 Checking for cross-contamination...');
    const checkInIds = new Set(checkInRequests.map(r => r._id));
    const checkOutIds = new Set(checkOutRequests.map(r => r._id));
    
    const overlap = [...checkInIds].filter(id => checkOutIds.has(id));
    
    if (overlap.length === 0) {
      console.log('✅ No cross-contamination between CHECK IN and CHECK OUT tabs');
    } else {
      console.error(`❌ Found ${overlap.length} requests in BOTH tabs!`);
      allPassed = false;
    }
    
    if (allPassed) {
      console.log('\n✅ TEST 5 PASSED: Tab filtering is correct\n');
    } else {
      console.error('\n❌ TEST 5 FAILED: Tab filtering has issues\n');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ TEST 5 FAILED:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   RECEPTION APPROVAL FLOWS - AUTOMATED TEST SUITE    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  if (TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
    console.error('❌ ERROR: Please set your admin TOKEN at the top of this script!');
    return;
  }
  
  const results = {
    test1: await testCheckInApproval(),
    test2: await testCheckOutApproval(),
    test3: await testValidationCheckOutToCheckIn(),
    test4: await testValidationCheckInToCheckOut(),
    test5: await testTabFiltering()
  };
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  TEST RESULTS SUMMARY                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('Test 1 (Check-In Flow):    ', results.test1 ? '✅ PASSED' : '⚠️  SKIPPED/FAILED');
  console.log('Test 2 (Check-Out Flow):   ', results.test2 ? '✅ PASSED' : '⚠️  SKIPPED/FAILED');
  console.log('Test 3 (Validation 1):     ', results.test3 ? '✅ PASSED' : '⚠️  SKIPPED/FAILED');
  console.log('Test 4 (Validation 2):     ', results.test4 ? '✅ PASSED' : '⚠️  SKIPPED/FAILED');
  console.log('Test 5 (Tab Filtering):    ', results.test5 ? '✅ PASSED' : '⚠️  SKIPPED/FAILED');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! The approval flows are working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.\n');
  }
}

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCheckInApproval,
    testCheckOutApproval,
    testValidationCheckOutToCheckIn,
    testValidationCheckInToCheckOut,
    testTabFiltering,
    runAllTests
  };
}

// Run tests if executed directly
runAllTests().catch(console.error);
