"use client";

/**
 * Configuration for File Registry smart contract on Sui
 * 
 * Package deployed on Sui Testnet
 * Transaction: AUmM4GCUxL6wv2AEJxq5eg2LQPScoYK7B8YqSEmqsnJb
 */

// File Registry Package ID (deployed on testnet)
export const FILE_REGISTRY_PACKAGE_ID = "0xd6829acedddd2bae3602e16e4130c8e326562b49fd8d29a031362650114bd49f";

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
