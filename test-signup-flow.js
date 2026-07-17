const axios = require('axios');

async function testSignupFlow() {
  const apiBaseUrl = 'http://68.183.101.60:8090'; // Test directly against PocketBase
  const apiUrl = '/api'; // relative path version

  const testEmail = `testsignup${Date.now()}@example.com`;
  const testName = `TestUser${Math.random().toString(36).substr(2, 9)}`;
  const testPassword = 'TestPass123!';

  console.log('Testing signup flow...');
  console.log(`Email: ${testEmail}`);
  console.log(`Name: ${testName}`);
  console.log('');

  try {
    // Create a custom axios instance that uses the relative base URL
    const apiClient = axios.create({
      baseURL: apiBaseUrl
    });

    console.log('Step 1: Creating user at', apiBaseUrl + apiUrl + '/collections/users/records');
    const createResponse = await apiClient.post(
      apiUrl + '/collections/users/records',
      { email: testEmail, password: testPassword, passwordConfirm: testPassword, name: testName }
    );

    console.log('✅ User created!');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2).substring(0, 200));
    console.log('');

    console.log('Step 2: Logging in at', apiBaseUrl + apiUrl + '/collections/users/auth-with-password');
    const loginResponse = await apiClient.post(
      apiUrl + '/collections/users/auth-with-password',
      { identity: testEmail, password: testPassword }
    );

    console.log('✅ Login successful!');
    console.log('Token:', loginResponse.data.token ? loginResponse.data.token.substring(0, 30) + '...' : 'NO TOKEN');
    console.log('User ID:', loginResponse.data.record?.id);
    console.log('User Name:', loginResponse.data.record?.name);
    console.log('');

    // Now test with nginx proxy
    console.log('---');
    console.log('Testing through Nginx proxy on port 80...');
    const nginxClient = axios.create({
      baseURL: 'http://68.183.101.60'
    });

    const proxyTestEmail = `testproxy${Date.now()}@example.com`;
    console.log('Creating user through nginx...');
    const proxyCreateResponse = await nginxClient.post(
      '/api/collections/users/records',
      { email: proxyTestEmail, password: testPassword, passwordConfirm: testPassword, name: 'ProxyTest' }
    );

    console.log('✅ User created through proxy!');
    console.log('Response:', JSON.stringify(proxyCreateResponse.data, null, 2).substring(0, 200));

    console.log('');
    console.log('✅ ALL TESTS PASSED');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    process.exit(1);
  }
}

testSignupFlow();
