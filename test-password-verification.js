/**
 * Test script for password verification endpoint
 * 
 * Usage:
 * 1. Start the server: npm start
 * 2. In another terminal, run: node test-password-verification.js
 */

const http = require('http');

// Configuration
const config = {
  hostname: 'localhost',
  port: 3001,
  path: '/verify-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Test password verification
 * @param {string} username - User's email
 * @param {string} password - User's password
 */
function testPasswordVerification(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username,
      password
    });

    const req = http.request(config, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: result
          });
        } catch (error) {
          reject(new Error('Failed to parse response: ' + error.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Run test cases
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Password Verification Endpoint Tests');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'Valid credentials',
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword',
      expectedStatus: 200
    },
    {
      name: 'Invalid password',
      username: 'admin@snyk.io',
      password: 'WrongPassword',
      expectedStatus: 401
    },
    {
      name: 'Non-existent user',
      username: 'nonexistent@example.com',
      password: 'SomePassword',
      expectedStatus: 401
    },
    {
      name: 'Invalid email format',
      username: 'not-an-email',
      password: 'SomePassword',
      expectedStatus: 400
    },
    {
      name: 'Missing password',
      username: 'admin@snyk.io',
      password: '',
      expectedStatus: 400
    },
    {
      name: 'Missing username',
      username: '',
      password: 'SomePassword',
      expectedStatus: 400
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\nTest: ${testCase.name}`);
      console.log(`Username: ${testCase.username || '(empty)'}`);
      console.log(`Password: ${testCase.password || '(empty)'}`);
      
      const result = await testPasswordVerification(testCase.username, testCase.password);
      
      const passed = result.statusCode === testCase.expectedStatus;
      console.log(`Status: ${result.statusCode} - ${passed ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`Response: ${JSON.stringify(result.data, null, 2)}`);
      
      if (!passed) {
        console.log(`Expected status: ${testCase.expectedStatus}`);
      }
    } catch (error) {
      console.log(`✗ FAIL - Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('\nError: Could not connect to server.');
        console.log('Please ensure the server is running on port 3001');
        console.log('Run: npm start');
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Tests completed');
  console.log('='.repeat(60));
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});





