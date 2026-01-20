const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const environment = process.env.PLAID_ENV || 'sandbox';
const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;

if (!clientId || !secret) {
  console.warn('PLAID_CLIENT_ID or PLAID_SECRET not set. Plaid routes will fail until configured.');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[environment],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId || '',
      'PLAID-SECRET': secret || '',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

module.exports = { plaidClient };
