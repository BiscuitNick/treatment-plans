import { spawnSync } from 'child_process';

console.log('Running Environment Variable Validation Tests...');

// Helper to run the env file
const runEnvCheck = (envVars: NodeJS.ProcessEnv) => {
  return spawnSync('npx', ['tsx', 'lib/env.ts'], {
    env: envVars,
    encoding: 'utf-8'
  });
};

// Test 1: Missing variables
console.log('Test 1: Testing with missing variables...');
const cleanEnv = { ...process.env };
// Delete our target vars to be sure
delete cleanEnv.AWS_REGION;
delete cleanEnv.AWS_ACCESS_KEY_ID;
delete cleanEnv.AWS_SECRET_ACCESS_KEY;
delete cleanEnv.COGNITO_USER_POOL_ID;
delete cleanEnv.S3_BUCKET_NAME;

const failResult = runEnvCheck(cleanEnv);

if (failResult.status !== 0) {
  console.log('✅ Correctly failed with missing variables.');
} else {
  console.error('❌ Failed: Should have thrown error but did not.');
  process.exit(1);
}

// Test 2: Valid variables
console.log('Test 2: Testing with valid variables...');
const validEnv = {
  ...cleanEnv,
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'mock-key',
  AWS_SECRET_ACCESS_KEY: 'mock-secret',
  COGNITO_USER_POOL_ID: 'mock-pool',
  S3_BUCKET_NAME: 'mock-bucket'
};

const passResult = runEnvCheck(validEnv);

if (passResult.status === 0) {
  console.log('✅ Correctly passed with valid variables.');
} else {
  console.error('❌ Failed: Should have passed but threw error.');
  console.error(passResult.stderr);
  process.exit(1);
}
