import { cn } from './utils';

describe('cn (classnames utility)', () => {
  it('should merge simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should handle undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('should merge tailwind classes correctly', () => {
    // twMerge should resolve conflicting utilities
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });

  it('should merge complex tailwind combinations', () => {
    // Background color override
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');

    // Padding should be merged properly
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2');

    // Multiple utilities
    expect(cn('flex items-center', 'justify-between')).toBe('flex items-center justify-between');
  });

  it('should handle responsive prefixes', () => {
    expect(cn('md:flex', 'lg:hidden')).toBe('md:flex lg:hidden');
  });

  it('should handle hover and other state prefixes', () => {
    expect(cn('hover:bg-blue-500', 'hover:bg-red-500')).toBe('hover:bg-red-500');
  });
});
