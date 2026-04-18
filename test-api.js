import { spawn } from 'child_process';

console.log('Starting Triple F API verification...\n');

const child = spawn(process.execPath, ['tests/smoke.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
  },
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\nAPI verification completed successfully.');
  } else {
    console.error(`\nAPI verification failed with exit code ${code}.`);
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('\nFailed to start API verification:', error.message);
  process.exit(1);
});
