module.exports = {
  v4: jest.fn(() => 'test-uuid-1234-5678-9012-345678901234'),
  v1: jest.fn(() => 'test-uuid-v1-1234-5678-9012-345678901234'),
  v3: jest.fn(() => 'test-uuid-v3-1234-5678-9012-345678901234'),
  v5: jest.fn(() => 'test-uuid-v5-1234-5678-9012-345678901234'),
};