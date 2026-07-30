import { test, expect } from '@playwright/test';

test.describe('Scenario 5: Recommendation Service', () => {
  // Helper function to wait until model is trained
  async function waitForModelTrained(request, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const response = await request.get('/api/recommendation/model/status');
        if (response.ok()) {
          const body = await response.json();
          if (body.is_trained && !body.is_training_in_progress) {
            console.log(`[E2E] Model is trained. Trained at: ${body.trained_at}`);
            return;
          }
        }
      } catch (err) {
        console.warn('[E2E] Error checking model status, retrying...', err);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Timeout waiting for model training to complete');
  }

  test('1. should verify model status endpoint', async ({ request }) => {
    const response = await request.get('/api/recommendation/model/status');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('is_trained');
    expect(body).toHaveProperty('is_training_in_progress');
  });

  test('2. should verify cold start recommendation for unregistered user', async ({ request }) => {
    // A user with no history should fall back to popular products (5 items)
    const response = await request.get('/api/recommendation?user_id=non_existent_user_xyz@example.com&limit=5');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user_id).toBe('non_existent_user_xyz@example.com');
    expect(body.strategy).toBe('popular_fallback');
    expect(body.recommendations).toHaveLength(5);
    for (const item of body.recommendations) {
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('product_name');
      expect(item).toHaveProperty('category_id');
      expect(item).toHaveProperty('price');
      expect(item).toHaveProperty('score');
    }
  });

  test('3. should verify recommendation for trained user dev_user_001', async ({ request }) => {
    // Wait until the initial startup training is done
    await waitForModelTrained(request);

    const response = await request.get('/api/recommendation?user_id=dev_user_001&limit=10');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user_id).toBe('dev_user_001');
    expect(body.strategy).toBe('lightfm_warp');
    expect(body.recommendations.length).toBeGreaterThan(0);
    expect(body.recommendations.length).toBeLessThanOrEqual(10);
    for (const item of body.recommendations) {
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('product_name');
      expect(item).toHaveProperty('category_id');
      expect(item).toHaveProperty('price');
      expect(item).toHaveProperty('score');
    }
  });

  test('4. should verify similar products endpoint for Acoustic Guitar', async ({ request }) => {
    await waitForModelTrained(request);

    const acousticGuitarId = '9f9a6e2a-0cd8-4228-b80c-7b2fbfd5db6b';
    const response = await request.get(`/api/recommendation/similar?product_id=${acousticGuitarId}&limit=5`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.product_id).toBe(acousticGuitarId);
    expect(body.similar_items.length).toBeGreaterThan(0);
    expect(body.similar_items.length).toBeLessThanOrEqual(5);
    for (const item of body.similar_items) {
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('product_name');
      expect(item).toHaveProperty('score');
    }
  });

  test('5. should verify training request endpoint', async ({ request }) => {
    const response = await request.post('/api/recommendation/train', {
      data: {}
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(['training_started', 'already_training']).toContain(body.status);
  });
});
