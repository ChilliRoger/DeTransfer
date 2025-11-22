import { NextRequest, NextResponse } from 'next/server';
import { fileDb, FileRecord } from '../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, blobId, fileName, fileType, fileSize, recipientAddress, isPublic } = body;

    if (!isPublic && !recipientAddress) {
      return NextResponse.json({ error: 'recipientAddress is required for private files' }, { status: 400 });
    }

    const record: Omit<FileRecord, 'id'> = {
      walletAddress,
      blobId,
      fileName,
      fileType,
      fileSize,
      recipientAddress: isPublic ? (recipientAddress || 'PUBLIC') : recipientAddress,
      uploadedAt: new Date().toISOString(),
      isPublic: !!isPublic
    };

    await fileDb.saveFile(record);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save file record:', error);
    return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const recipientAddress = searchParams.get('recipient');
    const blobId = searchParams.get('blobId');

    // If blobId is provided, return single file
    if (blobId) {
      const file = await fileDb.getFileByBlobId(blobId);
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      return NextResponse.json({ file });
    }

    // If recipient address is provided, return files shared with that recipient
    if (recipientAddress) {
      const files = await fileDb.getFilesByRecipient(recipientAddress);
      return NextResponse.json({ files });
    }

    // Otherwise, return files by wallet (uploaded by this wallet)
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address, recipient address, or blobId required' }, { status: 400 });
    }

    const files = await fileDb.getFilesByWallet(walletAddress);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const blobId = searchParams.get('blobId');
    const walletAddress = searchParams.get('wallet');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll && walletAddress) {
      // Delete all files for a wallet
      const deletedCount = await fileDb.deleteAllFilesByWallet(walletAddress);
      return NextResponse.json({ success: true, deletedCount });
    } else if (blobId) {
      // Delete a single file
      const success = await fileDb.deleteFile(blobId);
      if (!success) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'blobId or wallet (with deleteAll) required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to delete file(s):', error);
    return NextResponse.json({ error: 'Failed to delete file(s)' }, { status: 500 });
  }
}