"use client";

/**
 * Configuration for File Registry smart contract on Sui
 * 
 * Package deployed on Sui Testnet
 * Transaction: AUmM4GCUxL6wv2AEJxq5eg2LQPScoYK7B8YqSEmqsnJb
 */

// File Registry Package ID (deployed on testnet)
export const FILE_REGISTRY_PACKAGE_ID = "0x8064b110b86088b9daf3677a8574276d8820cdf2480e19a104f56219626a9301";

export const FILE_REGISTRY_MODULE = "file_registry";

/**
 * Get the full target for Move function calls
 */
export function getFileRegistryTarget(functionName: string): string {
    return `${FILE_REGISTRY_PACKAGE_ID}::${FILE_REGISTRY_MODULE}::${functionName}`;
}

/**
 * Get the FileRecord struct type
 */
export function getFileRecordType(): string {
    return `${FILE_REGISTRY_PACKAGE_ID}::${FILE_REGISTRY_MODULE}::FileRecord`;
}
