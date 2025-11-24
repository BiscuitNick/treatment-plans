import { s3Client, cognitoClient } from '../lib/aws-config';
import { S3Client } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

console.log('Verifying AWS Clients...');

if (s3Client instanceof S3Client) {
  console.log('✅ s3Client is instance of S3Client');
} else {
  console.error('❌ s3Client is NOT instance of S3Client');
  process.exit(1);
}

if (cognitoClient instanceof CognitoIdentityProviderClient) {
  console.log('✅ cognitoClient is instance of CognitoIdentityProviderClient');
} else {
  console.error('❌ cognitoClient is NOT instance of CognitoIdentityProviderClient');
  process.exit(1);
}
