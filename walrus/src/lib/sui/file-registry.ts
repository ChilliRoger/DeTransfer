"use client";

import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { getFileRegistryTarget, getFileRecordType } from "./config";

export interface FileMetadata {
    blobId: string;
    uploader: string;
    recipient: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: number;
    isPublic: boolean;
}

// Type for FileUploaded event data
interface FileUploadedEvent {
    blob_id: number[];
    uploader: string;
    recipient: string;
    file_name: string;
    uploaded_at: string;
    is_public: boolean;
}

// Type for Sui event with parsed JSON
interface SuiEventWithParsedJson {
    parsedJson: FileUploadedEvent;
}

/**
 * Create a transaction to register a file on-chain
 * Returns the transaction object for signing
 */
/**
 * Create a transaction to register a file on-chain
 * Returns the transaction object for signing
 */
export function createRegisterFileTransaction(
    blobId: string,
    recipient: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    isPublic: boolean
): Transaction {
    const tx = new Transaction();

    tx.moveCall({
        target: getFileRegistryTarget("register_file"),
        arguments: [
            tx.pure.vector("u8", new TextEncoder().encode(blobId)),
            tx.pure.address(recipient),
            tx.pure.string(fileName),
            tx.pure.string(fileType),
            tx.pure.u64(fileSize),
            tx.pure.bool(isPublic),
        ],
    });

    return tx;
}

/**
 * Query files uploaded by a specific wallet address
 */
export async function getFilesByUploader(
    suiClient: SuiClient,
    uploaderAddress: string
): Promise<FileMetadata[]> {
    try {
        // Query all FileRecord objects owned by the uploader
        // Note: FileRecords are transferred to recipients, so this might not return all uploads
        // We'll need to use events for complete history

        const { data } = await suiClient.getOwnedObjects({
            owner: uploaderAddress,
            filter: {
                StructType: getFileRecordType(),
            },
            options: {
                showContent: true,
            },
        });

        return data
            .filter(obj => obj.data?.content?.dataType === "moveObject")
            .map(obj => {
                const fields = (obj.data!.content as any).fields;
                return {
                    blobId: bytesToString(fields.blob_id),
                    uploader: fields.uploader,
                    recipient: fields.recipient,
                    fileName: fields.file_name,
                    fileType: fields.file_type,
                    fileSize: parseInt(fields.file_size),
                    uploadedAt: parseInt(fields.uploaded_at),
                    isPublic: fields.is_public,
                };
            });
    } catch (error) {
        console.error("Error fetching files by uploader:", error);
        return [];
    }
}

/**
 * Query files shared with a specific recipient address
 */
export async function getFilesByRecipient(
    suiClient: SuiClient,
    recipientAddress: string
): Promise<FileMetadata[]> {
    try {
        // Query all FileRecord objects owned by the recipient
        const { data } = await suiClient.getOwnedObjects({
            owner: recipientAddress,
            filter: {
                StructType: getFileRecordType(),
            },
            options: {
                showContent: true,
            },
        });

        // Map and sort by object version (higher version = more recent transfer)
        return data
            .filter(obj => obj.data?.content?.dataType === "moveObject")
            .map(obj => {
                const fields = (obj.data!.content as any).fields;
                return {
                    blobId: bytesToString(fields.blob_id),
                    uploader: fields.uploader,
                    recipient: fields.recipient,
                    fileName: fields.file_name,
                    fileType: fields.file_type,
                    fileSize: parseInt(fields.file_size),
                    uploadedAt: parseInt(fields.uploaded_at),
                    isPublic: fields.is_public,
                    // Store object version for sorting
                    _objectVersion: parseInt(obj.data!.version || "0"),
                };
            })
            // Sort by object version descending (most recent first)
            .sort((a: any, b: any) => b._objectVersion - a._objectVersion);
    } catch (error) {
        console.error("Error fetching files by recipient:", error);
        return [];
    }
}

/**
 * Query files using events (more comprehensive than owned objects)
 * This will return ALL files uploaded by a user, even if transferred to recipients
 */
export async function getFilesByUploaderViaEvents(
    suiClient: SuiClient,
    uploaderAddress: string
): Promise<FileMetadata[]> {
    try {
        // Query FileUploaded events
        const events = await suiClient.queryEvents({
            query: {
                MoveEventType: getFileRegistryTarget("FileUploaded"),
            },
            limit: 50,
        });

        // Filter and map events with proper type handling
        return events.data
            .map((event) => {
                const parsed = (event as any).parsedJson as FileUploadedEvent | undefined;
                if (!parsed || parsed.uploader !== uploaderAddress) {
                    return null;
                }
                return {
                    blobId: bytesToString(parsed.blob_id),
                    uploader: parsed.uploader,
                    recipient: parsed.recipient,
                    fileName: parsed.file_name,
                    fileType: "", // Not in event, would need to query object
                    fileSize: 0,  // Not in event, would need to query object
                    uploadedAt: parseInt(parsed.uploaded_at),
                    isPublic: parsed.is_public,
                };
            })
            .filter((item): item is FileMetadata => item !== null);
    } catch (error) {
        console.error("Error fetching files via events:", error);
        return [];
    }
}

/**
 * Get a single file by blob ID
 * Note: This requires knowing the object ID, which we don't have from just the blob ID
 * Better to use events or maintain a local cache
 */
export async function getFileByBlobId(
    suiClient: SuiClient,
    blobId: string
): Promise<FileMetadata | null> {
    try {
        // Query events to find the file
        const events = await suiClient.queryEvents({
            query: {
                MoveEventType: getFileRegistryTarget("FileUploaded"),
            },
            limit: 100,
        });

        // Find matching blob ID with proper type handling
        for (const event of events.data) {
            const parsed = (event as any).parsedJson as FileUploadedEvent | undefined;
            if (parsed && bytesToString(parsed.blob_id) === blobId) {
                return {
                    blobId: bytesToString(parsed.blob_id),
                    uploader: parsed.uploader,
                    recipient: parsed.recipient,
                    fileName: parsed.file_name,
                    fileType: "", // Not in event
                    fileSize: 0,  // Not in event
                    uploadedAt: parseInt(parsed.uploaded_at),
                    isPublic: parsed.is_public,
                };
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching file by blob ID:", error);
        return null;
    }
}

/**
 * Helper: Convert byte array to string (UTF-8)
 */
function bytesToString(bytes: number[]): string {
    return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Helper: Convert byte array to hex string (kept for reference if needed)
 */
function bytesToHex(bytes: number[]): string {
    return "0x" + bytes.map(b => b.toString(16).padStart(2, "0")).join("");
}
