const testUserManagement = async () => {
  console.log('🧪 Testing User Management API endpoints...\n');

  // Test data
  const testUid = 'test-user-123';
  
  try {
    // Test 1: Check user status
    console.log('1. Testing user status check...');
    const statusResponse = await fetch(`http://localhost:3000/api/admin/user/status?uid=${testUid}`);
    const statusResult = await statusResponse.json();
    console.log('   Status check result:', statusResult);
    
    // Test 2: Update user status
    console.log('\n2. Testing user status update...');
    const updateResponse = await fetch('http://localhost:3000/api/admin/user/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testUid, isActive: false })
    });
    const updateResult = await updateResponse.json();
    console.log('   Update result:', updateResult);
    
    // Test 3: Disable user in auth
    console.log('\n3. Testing user disable in auth...');
    const disableResponse = await fetch('http://localhost:3000/api/admin/user/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testUid })
    });
    const disableResult = await disableResponse.json();
    console.log('   Disable result:', disableResult);
    
    // Test 4: Enable user in auth
    console.log('\n4. Testing user enable in auth...');
    const enableResponse = await fetch('http://localhost:3000/api/admin/user/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testUid })
    });
    const enableResult = await enableResponse.json();
    console.log('   Enable result:', enableResult);
    
    // Test 5: Cleanup user data
    console.log('\n5. Testing user data cleanup...');
    const cleanupResponse = await fetch('http://localhost:3000/api/admin/user/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testUid })
    });
    const cleanupResult = await cleanupResponse.json();
    console.log('   Cleanup result:', cleanupResult);
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  testUserManagement();
}

module.exports = { testUserManagement };
