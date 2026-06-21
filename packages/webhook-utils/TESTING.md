# Testing Guide for @guildpass/webhook-utils

This guide covers how to test webhook signature verification in your application.

## Running Unit Tests

The package includes comprehensive unit tests covering all verification scenarios.

### Prerequisites

```bash
# Build the package first
pnpm --filter @guildpass/webhook-utils build

# Or from root
pnpm build
```

### Run Tests

```bash
# From package directory
cd packages/webhook-utils
pnpm test

# From workspace root
pnpm test:webhook-utils

# Watch mode (re-run on changes)
pnpm test:watch
```

### Test Coverage

The test suite covers:

✅ **Valid Signatures**
- String payload verification
- Buffer payload verification
- Custom timestamp handling
- Disabled tolerance (timestamp validation off)

✅ **Invalid Signatures**
- Tampered payload detection
- Wrong secret rejection
- Invalid signature format
- Non-hex signature characters

✅ **Timestamp Validation (Replay Protection)**
- Stale timestamp rejection (too old)
- Future timestamp rejection
- Timestamp within tolerance acceptance

✅ **Malformed Headers**
- Missing signature header
- Missing timestamp component
- Missing v1 signature component
- Non-numeric timestamp

✅ **Input Validation**
- Missing secret
- Null payload
- Undefined payload
- Empty payload handling

✅ **Body Tampering Detection**
- Single character changes
- Added whitespace
- Encoding changes

✅ **Signature Generation**
- Valid format generation
- Custom timestamp support
- Buffer payload support
- Different payloads/secrets produce different signatures

## Integration Testing

### Testing Your Webhook Endpoint

Use `generateSignature` to create valid test requests:

```typescript
import { generateSignature } from '@guildpass/webhook-utils';

describe('Webhook Endpoint', () => {
  test('accepts valid webhook', async () => {
    // 1. Create a test payload
    const payload = JSON.stringify({
      type: 'member.joined',
      data: { memberId: 'test-123' }
    });

    // 2. Generate valid signature
    const { signature } = generateSignature({
      secret: process.env.WEBHOOK_SECRET,
      payload,
    });

    // 3. Send request
    const response = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-guildpass-signature': signature,
      },
      body: payload,
    });

    // 4. Verify response
    expect(response.status).toBe(200);
  });
});
```

### Testing Invalid Scenarios

```typescript
describe('Webhook Security', () => {
  test('rejects tampered payload', async () => {
    // Generate signature for original payload
    const original = JSON.stringify({ value: 100 });
    const { signature } = generateSignature({
      secret: process.env.WEBHOOK_SECRET,
      payload: original,
    });

    // Send different payload
    const tampered = JSON.stringify({ value: 999 });
    const response = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-guildpass-signature': signature,
      },
      body: tampered,
    });

    expect(response.status).toBe(401);
  });

  test('rejects stale timestamp', async () => {
    const payload = JSON.stringify({ event: 'test' });
    
    // Generate with old timestamp (1 hour ago)
    const { signature } = generateSignature({
      secret: process.env.WEBHOOK_SECRET,
      payload,
      timestamp: Math.floor(Date.now() / 1000) - 3600,
    });

    const response = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-guildpass-signature': signature,
      },
      body: payload,
    });

    expect(response.status).toBe(401);
  });

  test('rejects missing signature', async () => {
    const response = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // No signature header
      },
      body: JSON.stringify({ event: 'test' }),
    });

    expect(response.status).toBe(401);
  });
});
```

## Test Frameworks

### Jest

```typescript
import { describe, test, expect } from '@jest/globals';
import { generateSignature, verifySignature } from '@guildpass/webhook-utils';

describe('verifySignature', () => {
  test('verifies valid signature', () => {
    const secret = 'test-secret';
    const payload = JSON.stringify({ test: true });
    
    const { signature } = generateSignature({ secret, payload });
    const result = verifySignature({
      signatureHeader: signature,
      secret,
      payload,
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
```

### Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { generateSignature, verifySignature } from '@guildpass/webhook-utils';

describe('webhook verification', () => {
  it('should verify valid signatures', () => {
    const { signature } = generateSignature({
      secret: 'test',
      payload: '{}',
    });

    const result = verifySignature({
      signatureHeader: signature,
      secret: 'test',
      payload: '{}',
    });

    expect(result.valid).toBe(true);
  });
});
```

### Node.js Built-in Test Runner

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateSignature, verifySignature } from '../dist/index.js';

describe('webhook verification', () => {
  test('verifies valid signature', () => {
    const { signature } = generateSignature({
      secret: 'test',
      payload: '{}',
    });

    const result = verifySignature({
      signatureHeader: signature,
      secret: 'test',
      payload: '{}',
    });

    assert.strictEqual(result.valid, true);
  });
});
```

## End-to-End Testing

### Playwright

```typescript
import { test, expect } from '@playwright/test';
import { generateSignature } from '@guildpass/webhook-utils';

test('webhook updates dashboard', async ({ page, request }) => {
  // Send webhook
  const payload = JSON.stringify({
    type: 'member.joined',
    data: { memberId: 'test-123', guildId: 'guild-456' },
  });

  const { signature } = generateSignature({
    secret: process.env.WEBHOOK_SECRET,
    payload,
  });

  await request.post('http://localhost:3000/api/webhook', {
    headers: {
      'content-type': 'application/json',
      'x-guildpass-signature': signature,
    },
    data: payload,
  });

  // Verify UI updated
  await page.goto('http://localhost:3000/members');
  await expect(page.locator('[data-member-id="test-123"]')).toBeVisible();
});
```

### Cypress

```typescript
import { generateSignature } from '@guildpass/webhook-utils';

describe('Webhook Integration', () => {
  it('processes webhook and updates UI', () => {
    const payload = JSON.stringify({
      type: 'member.joined',
      data: { memberId: 'test-123' },
    });

    const { signature } = generateSignature({
      secret: Cypress.env('WEBHOOK_SECRET'),
      payload,
    });

    cy.request({
      method: 'POST',
      url: '/api/webhook',
      headers: {
        'content-type': 'application/json',
        'x-guildpass-signature': signature,
      },
      body: payload,
    }).then((response) => {
      expect(response.status).to.eq(200);
    });

    cy.visit('/members');
    cy.get('[data-member-id="test-123"]').should('be.visible');
  });
});
```

## Manual Testing

### Using cURL

```bash
# 1. Generate a signature (use Node.js REPL or script)
node -e "
const { generateSignature } = require('./dist/index.js');
const payload = JSON.stringify({ event: 'test' });
const { signature } = generateSignature({
  secret: 'your-secret',
  payload
});
console.log('Signature:', signature);
console.log('Payload:', payload);
"

# 2. Send request with cURL
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-guildpass-signature: t=1234567890,v1=abc123..." \
  -d '{"event":"test"}'
```

### Using Postman/Insomnia

1. Create a pre-request script to generate the signature:

```javascript
const crypto = require('crypto');

const secret = pm.environment.get('WEBHOOK_SECRET');
const payload = pm.request.body.raw;
const timestamp = Math.floor(Date.now() / 1000);

const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(signedPayload)
  .digest('hex');

const signatureHeader = `t=${timestamp},v1=${signature}`;
pm.request.headers.add({
  key: 'x-guildpass-signature',
  value: signatureHeader
});
```

2. Set the request body to raw JSON
3. Send the request

## Continuous Integration

### GitHub Actions

```yaml
name: Test Webhooks

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build webhook-utils
        run: npm run build --workspace=@guildpass/webhook-utils
      
      - name: Run tests
        run: npm test --workspace=@guildpass/webhook-utils
        env:
          WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
```

## Common Issues

### "Invalid signature" in tests

**Cause**: Body was modified between signing and verification

**Solution**:
- Ensure you're using the exact same payload string
- Check for automatic JSON formatting/minification
- Verify no middleware is modifying the body

### Tests pass but real webhooks fail

**Cause**: Raw body not being captured correctly

**Solution**:
- Verify raw body middleware is configured
- Check that body parsers aren't running before webhook handler
- Log both the received body and what was signed

### Timestamp errors in CI

**Cause**: Clock skew or slow test execution

**Solution**:
- Use custom timestamps in tests instead of `Date.now()`
- Increase tolerance in test environment
- Mock the current time

## Performance Testing

### Load Testing with Artillery

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: 'Webhook delivery'
    flow:
      - post:
          url: '/api/webhook'
          headers:
            Content-Type: 'application/json'
            x-guildpass-signature: 't=1234567890,v1=abc123...'
          json:
            event: 'test'
```

### Benchmark Signature Verification

```typescript
import { generateSignature, verifySignature } from '@guildpass/webhook-utils';

const ITERATIONS = 10000;
const payload = JSON.stringify({ test: true });
const secret = 'benchmark-secret';

const { signature } = generateSignature({ secret, payload });

console.time('verify-10k');
for (let i = 0; i < ITERATIONS; i++) {
  verifySignature({ signatureHeader: signature, secret, payload });
}
console.timeEnd('verify-10k');
```

Expected performance: ~10,000 verifications per second on modern hardware.

## Security Testing

### Fuzzing

Test with random/malformed inputs to ensure no crashes:

```typescript
import { verifySignature } from '@guildpass/webhook-utils';

const fuzzInputs = [
  { signatureHeader: null, secret: 'test', payload: '{}' },
  { signatureHeader: undefined, secret: 'test', payload: '{}' },
  { signatureHeader: '', secret: '', payload: '' },
  { signatureHeader: 'x'.repeat(10000), secret: 'test', payload: '{}' },
  { signatureHeader: 't=abc,v1=def', secret: 'test', payload: '{}' },
  // Add more edge cases
];

fuzzInputs.forEach(input => {
  const result = verifySignature(input);
  expect(result.valid).toBe(false);
  expect(() => verifySignature(input)).not.toThrow();
});
```

## Additional Resources

- [Package README](./README.md) - Full documentation
- [Examples](./examples/) - Integration examples
- [Node.js Test Runner Docs](https://nodejs.org/api/test.html)
