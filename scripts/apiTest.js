const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

class APITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
    this.testResults = [];
  }

  async testEndpoint(method, path, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${path}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data && (method === 'POST' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      
      this.testResults.push({
        endpoint: `${method} ${path}`,
        status: 'PASS',
        statusCode: response.status,
        response: response.data
      });

      return { success: true, data: response.data };
    } catch (error) {
      this.testResults.push({
        endpoint: `${method} ${path}`,
        status: 'FAIL',
        statusCode: error.response?.status || 'NETWORK_ERROR',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  async testAuthEndpoints() {
    console.log('🔐 Testing Authentication Endpoints...');
    
    // Test login
    const loginResult = await this.testEndpoint('POST', '/auth/login', {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'password123'
    });

    if (loginResult.success) {
      this.token = loginResult.data.session.access_token;
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed:', loginResult.error);
      return false;
    }

    // Test protected endpoint
    await this.testEndpoint('GET', '/auth/me', null, {
      'Authorization': `Bearer ${this.token}`
    });

    return true;
  }

  async testAPIEndpoints() {
    console.log('🔌 Testing API Endpoints...');
    
    const headers = {
      'Authorization': `Bearer ${this.token}`
    };

    // Test Accounts
    await this.testEndpoint('GET', '/api/accounts', null, headers);
    
    // Test Transactions
    await this.testEndpoint('GET', '/api/transactions', null, headers);
    
    // Test Categories
    await this.testEndpoint('GET', '/api/categories', null, headers);
    
    // Test Analytics
    await this.testEndpoint('GET', '/api/analytics/overview', null, headers);
    await this.testEndpoint('GET', '/api/analytics/trends?interval=daily&days=7', null, headers);
    
    // Test Subscriptions
    await this.testEndpoint('GET', '/api/subscriptions', null, headers);
    await this.testEndpoint('GET', '/api/subscriptions/upcoming?days=30', null, headers);
    
    // Test Notifications
    await this.testEndpoint('GET', '/api/notifications', null, headers);
    
    // Test Plaid endpoints
    await this.testEndpoint('POST', '/api/plaid/link-token', null, headers);
  }

  async testPlaidEndpoints() {
    console.log('🏦 Testing Plaid Endpoints...');
    
    const headers = {
      'Authorization': `Bearer ${this.token}`
    };

    // Test link token creation
    const linkTokenResult = await this.testEndpoint('POST', '/api/plaid/link-token', null, headers);
    
    if (linkTokenResult.success) {
      console.log('✅ Plaid link token created');
    } else {
      console.log('❌ Plaid link token failed:', linkTokenResult.error);
    }

    // Test account refresh
    await this.testEndpoint('POST', '/api/plaid/accounts', null, headers);
    
    // Test transaction sync
    await this.testEndpoint('POST', '/api/plaid/transactions/sync', null, headers);
  }

  async runAllTests() {
    console.log('🚀 Starting API Tests...\n');
    
    // Test health endpoint
    await this.testEndpoint('GET', '/health');
    
    // Test authentication
    const authSuccess = await this.testAuthEndpoints();
    if (!authSuccess) {
      console.log('❌ Authentication tests failed, skipping other tests');
      return this.generateReport();
    }

    // Test main API endpoints
    await this.testAPIEndpoints();
    
    // Test Plaid endpoints
    await this.testPlaidEndpoints();
    
    return this.generateReport();
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;

    console.log('\n📊 Test Results:');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  ${r.endpoint}: ${r.error || 'Unknown error'}`);
        });
    }

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results: this.testResults
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester(BASE_URL);
  tester.runAllTests().then(report => {
    process.exit(report.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = APITester;
