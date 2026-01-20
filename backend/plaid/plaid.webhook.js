const crypto = require('crypto');
const express = require('express');
const plaidService = require('./plaid.service');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

function verifySignature(req) {
  const secret = process.env.PLAID_WEBHOOK_SECRET;
  const signatureHeader = req.headers['plaid-webhook-signature'];

  if (!secret || !signatureHeader || !req.rawBody) {
    return false;
  }

  const computed = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  const expected = `v1=${computed}`;
  const signatures = signatureHeader.split(',').map((part) => part.trim());

  return signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch (error) {
      return false;
    }
  });
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const verified = verifySignature(req);
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
