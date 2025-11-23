#!/usr/bin/env node

/**
 * Script to update page.tsx with on-chain metadata integration
 * Replaces all Turso database calls with Sui blockchain queries
 */

const fs = require('fs');
const path = require('path');

const PAGE_PATH = path.join(__dirname, '../src/app/page.tsx');

console.log('Reading page.tsx...');
let content = fs.readFileSync(PAGE_PATH, 'utf8');

// 1. Add on-chain imports after existing imports
console.log('Step 1: Adding on-chain imports...');
const importSection = `import { useSearchParams } from "next/navigation";

// On-chain file registry integration
import {
  createRegisterFileTransaction,
  getFilesByUploaderViaEvents,
  getFilesByRecipient,
  getFileByBlobId,
} from "../lib/sui";`;

content = content.replace(
    /import { useSearchParams } from "next\/navigation";/,
    importSection
);

// 2. Replace loadUserFiles function
console.log('Step 2: Replacing loadUserFiles...');
const oldLoadUserFiles = /\/\/ Load user files from backend \(files uploaded by user\)\s+const loadUserFiles = async \(\) => \{[^}]+\{[^}]+\}[^}]+\};/s;
const newLoadUserFiles = `// Load user files from blockchain (files uploaded by user)
  const loadUserFiles = async () => {
    if (!account) return;
    try {
      const files = await getFilesByUploaderViaEvents(client, account.address);
      setUserFiles(files);
    } catch (e) {
      console.error("Failed to load files from blockchain", e);
    }
  };`;

content = content.replace(oldLoadUserFiles, newLoadUserFiles);

// 3. Replace loadSharedFiles function
console.log('Step 3: Replacing loadSharedFiles...');
const oldLoadSharedFiles = /\/\/ Load shared files \(files shared with user as recipient\)\s+const loadSharedFiles = async \(\) => \{[^}]+\{[^}]+\}[^}]+\};/s;
const newLoadSharedFiles = `// Load shared files from blockchain (files shared with user as recipient)
  const loadSharedFiles = async () => {
    if (!account) return;
    try {
      const normalizedAddress = normalizeSuiAddress(account.address);
      const files = await getFilesByRecipient(client, normalizedAddress);
      setSharedFiles(files);
    } catch (e) {
      console.error("Failed to load shared files from blockchain", e);
    }
  };`;

content = content.replace(oldLoadSharedFiles, newLoadSharedFiles);

// 4. Replace metadata storage in handleUpload
console.log('Step 4: Replacing metadata storage in handleUpload...');
const oldMetadataStorage = /\/\/ Save to database\s+await fetch\('\/api\/files',\s+\{[^}]+\},\s+\);/s;
const newMetadataStorage = `// Save metadata on blockchain
      setStatus("Storing metadata on blockchain...");
      const tx = createRegisterFileTransaction(
        newBlobId,
        isPublic ? account.address : normalizeSuiAddress(recipientAddress),
        file.name,
        file.type,
        file.size,
        isPublic
      );
      await signAndExecute({ transaction: tx });`;

content = content.replace(oldMetadataStorage, newMetadataStorage);

// 5. Replace metadata fetch in URL params handler
console.log('Step 5: Replacing metadata fetch in URL params...');
const oldFetchSharedFile = /const response = await fetch\(`\/api\/files\?blobId=\$\{sharedBlobId\}`\);[\s\S]+?if \(response\.ok\) \{[\s\S]+?const data = await response\.json\(\);[\s\S]+?const fileRecord = data\.file;[\s\S]+?if \(fileRecord\) \{[\s\S]+?setBlobId\(fileRecord\.blobId\);[\s\S]+?setFile\(\{ name: fileRecord\.fileName, type: fileRecord\.fileType \} as File\);[\s\S]+?setRecipientAddress\(fileRecord\.recipientAddress\);[\s\S]+?setIsPublic\(!!fileRecord\.isPublic\);[\s\S]+?setAccessBlobId\(""\);[\s\S]+?\}[\s\S]+?\}/;

const newFetchSharedFile = `const fileRecord = await getFileByBlobId(client, sharedBlobId);
          if (fileRecord) {
            setBlobId(fileRecord.blobId);
            setFile({ name: fileRecord.fileName, type: fileRecord.fileType } as File);
            setRecipientAddress(fileRecord.recipient);
            setIsPublic(fileRecord.isPublic);
            setAccessBlobId("");
          }`;

content = content.replace(oldFetchSharedFile, newFetchSharedFile);

// 6. Remove delete handlers
console.log('Step 6: Removing delete handlers...');
const deleteHandlers = /\/\/ ----- Delete Handlers -----[\s\S]+?const handleClearAllFiles = async \(\) => \{[\s\S]+?\};/;
content = content.replace(deleteHandlers, '// ----- Delete Handlers Removed (On-Chain) -----');

// 7. Replace metadata fetch in handleDownload
console.log('Step 7: Replacing metadata fetch in handleDownload...');
const oldDownloadMetadata = /const fileResponse = await fetch\(`\/api\/files\?blobId=\$\{blobId\}`\);[\s\S]+?if \(fileResponse\.ok\) \{[\s\S]+?const data = await fileResponse\.json\(\);[\s\S]+?if \(data\.file\) \{[\s\S]+?isFilePublic = !!data\.file\.isPublic;[\s\S]+?decryptRecipientAddress = data\.file\.recipientAddress;[\s\S]+?\}[\s\S]+?\}/;

const newDownloadMetadata = `const fileRecord = await getFileByBlobId(client, blobId);
          if (fileRecord) {
            isFilePublic = fileRecord.isPublic;
            decryptRecipientAddress = fileRecord.recipient;
          }`;

content = content.replace(oldDownloadMetadata, newDownloadMetadata);

// Write updated file
console.log('Writing updated page.tsx...');
fs.writeFileSync(PAGE_PATH, content, 'utf8');

console.log('✅ Successfully updated page.tsx with on-chain integration!');
console.log('\nNext steps:');
console.log('1. Delete src/app/api/files/route.ts');
console.log('2. Delete src/app/lib/database.ts');
console.log('3. Run: npm uninstall @libsql/client');
console.log('4. Test the application');
