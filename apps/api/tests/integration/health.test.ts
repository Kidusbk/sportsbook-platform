import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Health Endpoints', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 with healthy status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.version).toBeDefined();
    });
  });
  describe('GET /api/v1/ready', () => {
    it('should return readiness status', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body.data.checks).toBeDefined();
    });
  });
  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
