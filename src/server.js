import 'dotenv/config';

import app from './app.js';
import connectDatabase from './config/database.js';
import { ensureDefaultAdminUsers } from './controllers/authController.js';
import { ensureDemoData } from './services/demoSeedService.js';
import logger from './utils/logger.js';

const PORT = Number(process.env.PORT) || 5000;

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', { error: error?.message });
  console.error('Unhandled promise rejection:', error?.message || error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error?.message });
  console.error('Uncaught exception:', error?.message || error);
  process.exit(1);
});

const startServer = async () => {
  try {
    console.log('Starting Triple F Media backend...');
    await connectDatabase();
    console.log('Ensuring default admin users...');
    await ensureDefaultAdminUsers();
    console.log('Default admin users ready.');
    await ensureDemoData();
    console.log('Demo data check complete.');

    app.listen(PORT, () => {
      logger.info(`Triple F Media backend running on port ${PORT}`);
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
