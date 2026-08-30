import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { generateSpaceId } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind conflicts', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });
});

describe('generateSpaceId', () => {
  it('generates an 8 character id by default', () => {
    const id = generateSpaceId();
    expect(id).toHaveLength(8);
  });

  it('generates id of custom length', () => {
    expect(generateSpaceId(12)).toHaveLength(12);
    expect(generateSpaceId(4)).toHaveLength(4);
  });

  it('only contains alphanumeric characters', () => {
    const id = generateSpaceId(100);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSpaceId()));
    expect(ids.size).toBe(100);
  });

  it('handles length of 1', () => {
    const id = generateSpaceId(1);
    expect(id).toHaveLength(1);
    expect(id).toMatch(/^[A-Za-z0-9]$/);
  });

  it('handles length of 0', () => {
    expect(generateSpaceId(0)).toBe('');
  });
});
