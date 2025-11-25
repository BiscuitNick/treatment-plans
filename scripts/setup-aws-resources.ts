import { S3Client, CreateBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { CognitoIdentityProviderClient, CreateUserPoolCommand } from "@aws-sdk/client-cognito-identity-provider";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.error("❌ Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in your .env file.");
  process.exit(1);
}

const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

const cognito = new CognitoIdentityProviderClient({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  const timestamp = Date.now();
  const bucketName = `treatment-plans-demo-${timestamp}`;
  const userPoolName = `treatment-plans-pool-${timestamp}`;

  console.log("🚀 Starting AWS Resource Setup...");

  // 1. Create S3 Bucket
  try {
    console.log(`\nCreating S3 Bucket: ${bucketName}...`);
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    
    // Configure CORS for browser uploads
    await s3.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET"],
            AllowedOrigins: ["*"], // For demo only. In prod, restrict to domain.
            MaxAgeSeconds: 3000
          }
        ]
      }
    }));
    console.log("✅ S3 Bucket created and CORS configured.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("❌ Failed to create S3 Bucket:", err.message);
  }

  // 2. Create Cognito User Pool
  let userPoolId = "";
  try {
    console.log(`\nCreating Cognito User Pool: ${userPoolName}...`);
    const pool = await cognito.send(new CreateUserPoolCommand({ PoolName: userPoolName }));
    userPoolId = pool.UserPool?.Id || "";
    console.log("✅ Cognito User Pool created.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("❌ Failed to create User Pool:", err.message);
  }

  // Output Results
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Setup Complete! Update your .env file with these values:");
  console.log("=".repeat(50));
  console.log(`S3_BUCKET_NAME="${bucketName}"`);
  if (userPoolId) console.log(`COGNITO_USER_POOL_ID="${userPoolId}"`);
  console.log("=".repeat(50));
}

main();
