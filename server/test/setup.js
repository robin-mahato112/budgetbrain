process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/budgetbrain_test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';
process.env.AI_DAILY_LIMIT = '2';
process.env.AI_MONTHLY_LIMIT = '3';
