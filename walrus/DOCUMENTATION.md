# DeTransfer Technical Documentation

## 📘 Overview
DeTransfer is a **fully decentralized** file transfer application. It removes all reliance on centralized servers or databases by leveraging:
1.  **Sui Blockchain**: For immutable metadata storage and access control.
2.  **Walrus**: For decentralized, censorship-resistant blob storage.
3.  **Seal SDK**: For client-side end-to-end encryption.

---

## 🛠️ Integration Details

### 1. Seal SDK (Encryption & Access Control)
**Purpose**: Ensures files are encrypted *before* they leave the user's device and can only be decrypted by the intended recipient.

#### **Key Components**
-   **Package ID**: `0xd1d471dd362206f61194c711d9dfcd1f8fd2d3e44df102efc15fa07332996247`
-   **Module**: `simple_recipient`
-   **Function**: `seal_approve`

#### **Integration Logic**
-   **Encryption**:
    -   Uses `SealClient.encrypt()`
    -   **Critical**: The `id` parameter MUST be the recipient's **normalized** wallet address.
    -   **Usage**: `src/lib/seal/streaming-encryption.ts`
-   **Decryption**:
    -   Uses `SealClient.decrypt()`
    -   Requires a **Session Key** signed by the user's wallet (`signPersonalMessage`).
    -   Requires an **Authorization Transaction** calling `seal_approve`.
    -   **Usage**: `src/app/page.tsx` (inside `handleDownload`)

#### **Code Reference**
```typescript
// Authorization Transaction Construction
const tx = new Transaction();
tx.setSender(userAddress);
tx.moveCall({
    target: `${SEAL_PACKAGE_ID}::simple_recipient::seal_approve`,
    arguments: [tx.pure.vector("u8", fromHex(recipientAddress))],
});
```

---

### 2. Walrus (Decentralized Storage)
**Purpose**: Stores the actual encrypted file content (blobs).

#### **Key Components**
-   **Publisher URL**: `https://publisher.walrus-testnet.walrus.space`
-   **Aggregator URL**: `https://aggregator.walrus-testnet.walrus.space`

#### **Integration Logic**
-   **Upload**:
    -   HTTP `PUT` request to Publisher.
    -   Body: Raw binary data (encrypted or plaintext).
    -   Returns: A unique `blobId` (base64url string).
    -   **Usage**: `src/lib/walrus/client.ts` -> `uploadToWalrus`
-   **Download**:
    -   HTTP `GET` request to Aggregator with `blobId`.
    -   Returns: The file blob.
    -   **Usage**: `src/lib/walrus/client.ts` -> `downloadFromWalrus`

---

### 3. Sui Smart Contract (Metadata Registry)
**Purpose**: Replaces the traditional database. Stores file metadata (name, size, type, recipient) permanently on-chain.

#### **Contract Details**
-   **Package ID**: `0x8064b110b86088b9daf3677a8574276d8820cdf2480e19a104f56219626a9301`
-   **Module**: `file_registry`
-   **Source**: `move/file_registry/sources/file_registry.move`

#### **Key Functions**
1.  **`register_file`**:
    -   Creates a `FileRecord` object.
    -   Emits a `FileUploaded` event.
    -   Transfers the object to the **recipient** (so they own it).
    -   **Usage**: `src/lib/sui/file-registry.ts` -> `createRegisterFileTransaction`

2.  **`FileUploaded` Event**:
    -   Used to index and query file history.
    -   Contains: `uploader`, `recipient`, `blob_id`, `file_name`.

#### **Querying Strategy**
-   **My Uploads**: Query `FileUploaded` events where `uploader == user_address`.
-   **Shared With Me**: Query objects of type `FileRecord` owned by `user_address`.
-   **Public Files**: Query events filtering by `blob_id`.

---

## 📍 Usage Areas (Code Map)

| Feature | File Path | Description |
| :--- | :--- | :--- |
| **Main UI** | `src/app/page.tsx` | Orchestrates the entire flow. Handles wallet connection, state, and calls helper functions. |
| **Sui Config** | `src/lib/sui/config.ts` | Stores Contract IDs and helper functions for target strings. |
| **Registry Logic** | `src/lib/sui/file-registry.ts` | **Core Logic**. Contains `createRegisterFileTransaction` and query functions (`getFilesByUploader`, etc.). |
| **Walrus Client** | `src/lib/walrus/client.ts` | Handles HTTP requests to Walrus Publisher/Aggregator. |
| **Encryption** | `src/lib/seal/streaming-encryption.ts` | Handles chunked encryption to support large files without crashing memory. |

---

## ⚠️ Critical Implementation Notes

1.  **Blob ID Encoding**:
    -   Walrus returns Blob IDs as **base64url** strings (e.g., `q1eL...`).
    -   Sui Move expects `vector<u8>`.
    -   **Fix**: We use `TextEncoder` to convert the string to bytes before sending to the contract, and `TextDecoder` when reading back. **Do not use Hex decoding**.

2.  **Address Normalization**:
    -   Always use `normalizeSuiAddress()` before comparing addresses or sending them to the contract.
    -   Mismatching formats (e.g., `0x123` vs `0x0123`) will cause decryption failures.

3.  **Personal Message Signing**:
    -   Decryption **requires** the user to sign a message. This proves they own the wallet.
    -   If the signature is missing or invalid, the Seal SDK will reject the request.

4.  **Event Type Construction**:
    -   When querying events, the type must be `Package::Module::EventName`.
    -   Incorrect: `Package::Module::StructName::EventName`.

---

## 🚀 Deployment Guide

### 1. Deploy Contracts
```bash
# Deploy File Registry
cd move/file_registry
sui client publish --gas-budget 100000000

# Deploy Access Policy (if needed)
cd move/seal_access_policy
sui client publish --gas-budget 100000000
```

### 2. Update Config
Copy the **Package IDs** from the deployment output and update:
-   `src/lib/sui/config.ts` (for File Registry)
-   `src/app/page.tsx` (for Seal Access Policy)

### 3. Build Frontend
```bash
npm run build
# Exports a static site to /out
```

---

## 🔄 Future Roadmap
-   **Phase 2**: Encrypt metadata on-chain (currently public).
-   **Phase 3**: Implement file deletion (burning on-chain objects).
-   **Phase 4**: Add support for multiple recipients.

---

## Deployment

### Prerequisites
- Node.js 18+
- Sui CLI installed
- Sui wallet with testnet SUI tokens
- Next.js project set up

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Deploy Access Policy** (if not already deployed)
   ```bash
   cd move/seal_access_policy
   sui move build
   sui client publish --gas-budget 100000000
   ```

3. **Update Configuration**
   - Update `PACKAGE_ID` in `src/lib/seal/client.ts`
   - Update `PACKAGE_ID` in `src/app/page.tsx`
   - Set `MODULE` to `"simple_recipient"`

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

---

## Troubleshooting

### Common Issues

#### 1. Build Errors
- **Move module**: Check `edition = "2024"` in `Move.toml`
- **Address resolution**: Use `"0x0"` as placeholder
- **Dependencies**: Ensure Sui framework dependency is correct

#### 2. Runtime Errors
- **403 Forbidden**: Check recipient address matches user's wallet
- **Signature errors**: Ensure personal message is signed
- **Network errors**: Verify Walrus endpoints are correct

#### 3. Configuration Issues
- **Package ID**: Must match deployed package
- **Module name**: Must match Move module name
- **Key servers**: Use correct testnet key server object IDs

### Debug Checklist

- [ ] Package ID is correct in both config files
- [ ] Module name matches deployed module
- [ ] Addresses are normalized before comparison
- [ ] Personal message is signed before decryption
- [ ] Transaction sender is set correctly
- [ ] Recipient address is stored and retrieved correctly
- [ ] Walrus endpoints are accessible
- [ ] Key servers are configured correctly

---

## Quick Reference

### Seal SDK
- **Docs**: https://seal-docs.wal.app/
- **NPM**: `@mysten/seal`
- **Key Servers**: Public testnet servers (no setup needed)
- **Access Policy**: Must have `seal_approve` function

### Walrus
- **Docs**: https://docs.wal.app/
- **Web API**: https://docs.wal.app/usage/web-api.html
- **Testnet Publisher**: `https://publisher.walrus-testnet.walrus.space`
- **Testnet Aggregator**: `https://aggregator.walrus-testnet.walrus.space`

### Sui
- **Docs**: https://docs.sui.io/
- **Testnet Explorer**: https://suiexplorer.com/?network=testnet
- **Faucet**: https://docs.sui.io/guides/developer/getting-started/get-coins

---

## Important Reminders

### ✅ Always Do
1. Normalize addresses before comparison
2. Sign personal message before decryption
3. Set transaction sender to user's address
4. Store recipient address in database
5. Verify recipient matches before decryption
6. Use `onlyTransactionKind: true` for access evaluation
7. Handle errors gracefully with user-friendly messages

### ❌ Never Do
1. Skip personal message signature
2. Compare addresses without normalization
3. Use different address formats in encryption/decryption
4. Forget to store recipient address
5. Execute transactions (use `onlyTransactionKind: true`)
6. Modify on-chain state in access policy
7. Hardcode package IDs (use configuration)

---

## Support

For issues or questions:
- **Seal SDK**: https://seal-docs.wal.app/
- **Walrus**: https://docs.wal.app/
- **Sui**: https://docs.sui.io/

---

**Last Updated**: After deployment of `simple_recipient` access policy
**Package ID**: `0xd1d471dd362206f61194c711d9dfcd1f8fd2d3e44df102efc15fa07332996247`
**Module**: `simple_recipient`

