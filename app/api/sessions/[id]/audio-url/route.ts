import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@/lib/aws-config';
import { env } from '@/lib/env';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get session and verify ownership
    const sessionRecord = await prisma.session.findFirst({
      where: {
        id,
        clinicianId: session.user.id,
      },
    });

    if (!sessionRecord) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!sessionRecord.s3Key) {
      return NextResponse.json({ error: 'No audio file associated with this session' }, { status: 404 });
    }

    // Validate s3Key for security
    if (!sessionRecord.s3Key.startsWith('uploads/')) {
      return NextResponse.json({ error: 'Invalid audio file reference' }, { status: 400 });
    }

    // Generate presigned URL for playback (1 hour expiration)
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: sessionRecord.s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({
      url,
      expiresIn: 3600,
      filename: sessionRecord.s3Key.split('/').pop(),
    });
  } catch (error) {
    console.error('Error generating audio URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
