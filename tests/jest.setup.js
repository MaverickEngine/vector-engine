// Global Jest test setup and teardown
import { closeRedisConnection } from '../src/libs/cache.js';

// Close all connections after all tests complete
afterAll(async () => {
    // Close Redis connections
    await closeRedisConnection();

    // Give event loop time to complete any pending operations
    await new Promise(resolve => setTimeout(resolve, 500));
}); 