import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@/lib/aws-config';
import { env } from '@/lib/env';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^(audio|video)\/.*$/, "Must be an audio or video file"),
});

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedBody = uploadSchema.parse(body);
    const { filename, contentType } = validatedBody;

    // Sanitize filename and create unique key
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueKey = `uploads/${crypto.randomUUID()}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    return NextResponse.json({ uploadUrl, s3Key: uniqueKey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request parameters", details: error.issues }, { status: 400 });
    }
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
