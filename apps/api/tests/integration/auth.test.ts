import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should reject with missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad', username: 'testuser', password: 'ValidP@ss123!' });
      expect(res.status).toBe(400);
    });
    it('should reject short password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com', username: 'testuser', password: 'short' });
      expect(res.status).toBe(400);
    });
    it('should reject short username', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com', username: 'ab', password: 'ValidP@ss123!' });
      expect(res.status).toBe(400);
    });
  });
  describe('POST /api/v1/auth/login', () => {
    it('should reject with missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});
      expect(res.status).toBe(400);
    });
    it('should reject invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'invalid', password: 'pass' });
      expect(res.status).toBe(400);
    });
  });
  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
    it('should reject invalid token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid');
      expect(res.status).toBe(401);
    });
  });
  describe('POST /api/v1/auth/logout', () => {
    it('should reject unauthenticated', async () => {
      const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'x' });
      expect(res.status).toBe(401);
    });
  });
});
