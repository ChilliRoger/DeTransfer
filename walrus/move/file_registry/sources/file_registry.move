/// File Registry - On-chain metadata storage for DeTransfer
/// Stores file metadata on Sui blockchain for full decentralization
module file_registry::file_registry;

use std::string::String;
use sui::event;

/// File metadata record stored on-chain
/// Note: All fields are PUBLIC on the blockchain
public struct FileRecord has key, store {
    id: UID,
    blob_id: vector<u8>,        // Walrus blob ID
    uploader: address,           // Who uploaded the file
    recipient: address,          // Who can decrypt the file
    file_name: String,           // Original filename (PUBLIC)
    file_type: String,           // MIME type (PUBLIC)
    file_size: u64,              // Size in bytes (PUBLIC)
    uploaded_at: u64,            // Timestamp (epoch)
    expires_at: u64,             // 🆕 Epoch when file expires
    storage_epochs: u64,         // 🆕 Number of epochs purchased
    is_public: bool,             // Whether file is public or encrypted
}

/// Event emitted when a file is registered
/// Used for indexing and querying
public struct FileUploaded has copy, drop {
    blob_id: vector<u8>,
    uploader: address,
    recipient: address,
    file_name: String,
    uploaded_at: u64,
    expires_at: u64,             // 🆕
    storage_epochs: u64,         // 🆕
    is_public: bool,
}

/// Event emitted when a file record is deleted
public struct FileDeleted has copy, drop {
    blob_id: vector<u8>,
    deleted_by: address,
}

/// Register a new file on-chain
/// Creates a FileRecord object and transfers it to the recipient
/// 
/// # Arguments
/// * `blob_id` - Walrus blob ID (32 bytes)
/// * `recipient` - Address that can decrypt the file
/// * `file_name` - Original filename
/// * `file_type` - MIME type
/// * `file_size` - File size in bytes
/// * `storage_epochs` - Number of epochs to store the file
/// * `is_public` - Whether file is public or encrypted
/// * `ctx` - Transaction context
#[allow(lint(public_entry))]
public entry fun register_file(
    blob_id: vector<u8>,
    recipient: address,
    file_name: String,
    file_type: String,
    file_size: u64,
    storage_epochs: u64,
    is_public: bool,
    ctx: &mut TxContext
) {
    let uploader = ctx.sender();
    let uploaded_at = ctx.epoch();
    let expires_at = uploaded_at + storage_epochs;
    
    // Create file record
    let record = FileRecord {
        id: object::new(ctx),
        blob_id,
        uploader,
        recipient,
        file_name,
        file_type,
        file_size,
        uploaded_at,
        expires_at,
        storage_epochs,
        is_public,
    };
    
    // Emit event for indexing
    event::emit(FileUploaded {
        blob_id,
        uploader,
        recipient,
        file_name,
        uploaded_at,
        expires_at,
        storage_epochs,
        is_public,
    });
    
    // Transfer record to recipient for ownership
    // This ensures only the recipient can delete the record
    transfer::transfer(record, recipient);
}

/// Delete a file record (only owner can delete)
/// The record must be owned by the transaction sender
#[allow(lint(public_entry))]
public entry fun delete_file(
    record: FileRecord,
    ctx: &mut TxContext
) {
    let FileRecord {
        id,
        blob_id,
        uploader: _,
        recipient: _,
        file_name: _,
        file_type: _,
        file_size: _,
        uploaded_at: _,
        expires_at: _,
        storage_epochs: _,
        is_public: _,
    } = record;
    
    // Emit deletion event
    event::emit(FileDeleted {
        blob_id,
        deleted_by: ctx.sender(),
    });
    
    // Delete the object
    object::delete(id);
}

/// Get file record details (for testing/debugging)
/// In production, use Sui RPC to query objects
public fun get_blob_id(record: &FileRecord): vector<u8> {
    record.blob_id
}

public fun get_uploader(record: &FileRecord): address {
    record.uploader
}

public fun get_recipient(record: &FileRecord): address {
    record.recipient
}

public fun get_file_name(record: &FileRecord): String {
    record.file_name
}

public fun get_file_type(record: &FileRecord): String {
    record.file_type
}

public fun get_file_size(record: &FileRecord): u64 {
    record.file_size
}

public fun get_uploaded_at(record: &FileRecord): u64 {
    record.uploaded_at
}

public fun is_public(record: &FileRecord): bool {
    record.is_public
}
