describe('Basic Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should verify environment is set correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.SESSION_SECRET).toBe('test-secret-key-for-testing-only');
  });
});