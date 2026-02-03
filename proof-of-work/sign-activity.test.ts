// Unit tests for sign-activity.ts
// Run with: bun test sign-activity.test.ts

import { describe, expect, test } from 'bun:test';
import { hashActivity, Activity } from './sign-activity';

describe('hashActivity', () => {
  test('produces consistent hash for same activity', () => {
    const activity: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test activity',
      metadata: { test: true }
    };

    const hash1 = hashActivity(activity);
    const hash2 = hashActivity(activity);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
  });

  test('produces different hash for different timestamps', () => {
    const activity1: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test activity'
    };

    const activity2: Activity = {
      timestamp: '2026-02-03T13:00:00.000Z',
      type: 'build',
      description: 'Test activity'
    };

    expect(hashActivity(activity1)).not.toBe(hashActivity(activity2));
  });

  test('produces different hash for different types', () => {
    const activity1: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test activity'
    };

    const activity2: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'commit',
      description: 'Test activity'
    };

    expect(hashActivity(activity1)).not.toBe(hashActivity(activity2));
  });

  test('produces different hash for different descriptions', () => {
    const activity1: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'First description'
    };

    const activity2: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Second description'
    };

    expect(hashActivity(activity1)).not.toBe(hashActivity(activity2));
  });

  test('ignores signature and hash fields in computation', () => {
    const activityUnsigned: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test activity'
    };

    const activitySigned: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test activity',
      signature: 'some-solana-signature',
      hash: 'some-existing-hash'
    };

    // Hash should be identical since signature/hash are excluded
    expect(hashActivity(activityUnsigned)).toBe(hashActivity(activitySigned));
  });

  test('handles empty metadata', () => {
    const activity1: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test'
    };

    const activity2: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test',
      metadata: {}
    };

    // Should produce same hash (undefined metadata treated as {})
    expect(hashActivity(activity1)).toBe(hashActivity(activity2));
  });

  test('produces valid hex SHA256 format', () => {
    const activity: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test'
    };

    const hash = hashActivity(activity);
    
    // Should be valid hex string
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('different metadata produces different hash', () => {
    const activity1: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test',
      metadata: { version: '1.0' }
    };

    const activity2: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test',
      metadata: { version: '2.0' }
    };

    expect(hashActivity(activity1)).not.toBe(hashActivity(activity2));
  });

  test('handles complex nested metadata', () => {
    const activity: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'build',
      description: 'Test',
      metadata: {
        files: ['a.ts', 'b.ts'],
        stats: { lines: 100, commits: 5 },
        nested: { deep: { value: true } }
      }
    };

    const hash = hashActivity(activity);
    expect(hash).toHaveLength(64);
    
    // Should be deterministic
    expect(hashActivity(activity)).toBe(hash);
  });
});

describe('Activity interface', () => {
  test('required fields are timestamp, type, description', () => {
    const minimalActivity: Activity = {
      timestamp: '2026-02-03T12:00:00.000Z',
      type: 'test',
      description: 'Minimal activity'
    };

    // Should hash without error
    const hash = hashActivity(minimalActivity);
    expect(hash).toHaveLength(64);
  });
});
