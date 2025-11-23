"use client";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

// Simple Walrus HTTP API integration for testnet
const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export async function uploadToWalrus(
  file: File,
  epochs: number = 1, // Default to 1 epoch (1 day on testnet)
  onProgress?: (progress: number, timeRemaining: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const timeElapsed = (Date.now() - startTime) / 1000; // Seconds
        const uploadedBytes = event.loaded;
        const totalBytes = event.total;
        const speed = uploadedBytes / timeElapsed; // Bytes per second
        const remainingBytes = totalBytes - uploadedBytes;
        const secondsLeft = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
        const progress = Math.round((uploadedBytes / totalBytes) * 100);

        onProgress(progress, secondsLeft);
      }
    };

    // Pass epochs parameter to Walrus
    xhr.open('PUT', `${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.newlyCreated?.blobObject?.blobId) {
            resolve(result.newlyCreated.blobObject.blobId);
          } else if (result.alreadyCertified?.blobId) {
            resolve(result.alreadyCertified.blobId);
          } else {
            reject(new Error('No blob ID in response'));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Walrus'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    // Send the file directly as the body
    xhr.send(file);
  });
}

export async function downloadFromWalrus(
  blobId: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    // Download from Walrus aggregator (correct endpoint: /v1/blobs/{blobId})
    const response = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // If no progress callback or no content length, use simple blob download
    if (!onProgress || total === 0) {
      return await response.blob();
    }

    // Stream download with progress tracking
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (onProgress && total > 0) {
          const progress = Math.round((receivedLength / total) * 100);
          onProgress(progress);
        }
      }

      // Combine chunks into single blob
      const blob = new Blob(chunks);
      return blob;
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Error downloading from Walrus:', error);
    throw error;
  }
}

export function extractBlobId(blobId: string): string {
  return blobId;
}

/**
 * Walrus client initialized with SUI testnet
 */
export const walrusClient = new SuiClient({
  url: getFullnodeUrl("testnet"),
  // @ts-ignore – The Walrus SDK strictly requires this property to be present
  network: "testnet",
});
