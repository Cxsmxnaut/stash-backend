const express = require('express');
const plaidService = require('./plaid.service');
const { plaidClient } = require('../config/plaidClient');
const { asyncHandler } = require('../middleware/asyncHandler');
const { compactVerify, importJWK } = require('jose');

const router = express.Router();

const keyCache = new Map();

async function getVerificationKey(keyId) {
  const cached = keyCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const response = await plaidClient.webhookVerificationKeyGet({ key_id: keyId });
  const jwk = response.data.key;
  const key = await importJWK(jwk, jwk.alg);
  keyCache.set(keyId, { key, expiresAt: Date.now() + 60 * 60 * 1000 });
  return key;
}

async function verifySignature(req) {
  const signature = req.headers['plaid-webhook-signature'];
  const keyId = req.headers['plaid-verification-key-id'];

  if (!signature || !keyId || !req.rawBody) {
    return false;
  }

  const key = await getVerificationKey(keyId);
  const { payload } = await compactVerify(signature, key);

  const body = req.rawBody.toString('utf8');
  const signedPayload = Buffer.from(payload).toString('utf8');

  return body === signedPayload;
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    let verified = false;
    try {
      verified = await verifySignature(req);
    } catch (error) {
      verified = false;
    }
    if (!verified) {
      const event = req.body || {};
      console.warn('Rejected Plaid webhook', {
        webhook_type: event.webhook_type,
        webhook_code: event.webhook_code,
        item_id: event.item_id,
      });
      return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } });
    }

    const result = await plaidService.handleWebhook(req.body || {});
    return res.json({ data: result });
  })
);

module.exports = { router };
