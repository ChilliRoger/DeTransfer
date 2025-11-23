"use client";

import React, { useState, useEffect, Suspense } from "react";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, normalizeSuiAddress } from "@mysten/sui/utils";
import { motion, AnimatePresence } from "framer-motion";

import { SealClient, SessionKey } from "@mysten/seal";
import { UploadCloud, CheckCircle, Loader2, AlertCircle, FileText, Download, Lock, Unlock, Trash2, Share2, Copy, QrCode, Link as LinkIcon, User, Paperclip, X, ArrowRight, CheckCircle2, Database, Wifi } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";
import { createRegisterFileTransaction, getFilesByUploaderViaEvents, getFilesByRecipient, getFileByBlobId } from "../lib/sui";
import MatrixAnimation from "@/components/MatrixAnimation";
import CircularProgress from "@/components/CircularProgress";

/* -------------------------------------------------------------------------- */
/* SDK INITIALIZATION                                                         */
/* -------------------------------------------------------------------------- */
const client = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

// Seal Configuration – using simple_recipient access policy for recipient-only decryption
const SEAL_PACKAGE_ID = "0xd1d471dd362206f61194c711d9dfcd1f8fd2d3e44df102efc15fa07332996247";
const SEAL_MODULE = "simple_recipient";

const sealClient = new SealClient({
  suiClient: client,
  serverConfigs: [
    { objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 },
    { objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 },
  ],
});

function UploadContent() {
  // --- Hooks ---
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const searchParams = useSearchParams();

  // --- State ---
  const [files, setFiles] = useState<File[]>([]); // 🆕 Support multiple files
  const [uploadedBatch, setUploadedBatch] = useState<{ blobId: string, name: string, type: string, size: number }[]>([]); // Track batch uploads
  const [recipientAddress, setRecipientAddress] = useState("");
  const [status, setStatus] = useState("Idle");
  const [blobId, setBlobId] = useState("");
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [shareBlobId, setShareBlobId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [autoDownloadBlobId, setAutoDownloadBlobId] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [storageEpochs, setStorageEpochs] = useState(1);
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("days");
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);

  // Fetch current epoch on mount
  useEffect(() => {
    const fetchEpoch = async () => {
      try {
        const state = await client.getLatestSuiSystemState();
        setCurrentEpoch(Number(state.epoch));
      } catch (e) {
        console.error("Failed to fetch current epoch", e);
      }
    };
    fetchEpoch();
  }, []);

  // Helper to convert epoch to date (approximate)
  const getEpochDate = (epoch: number) => {
    if (!epoch || !currentEpoch) return new Date(); // Fallback to now
    // Calculate difference in epochs
    const diff = epoch - currentEpoch;
    // Add difference in days (assuming 1 epoch = 1 day on testnet)
    const date = new Date();
    date.setDate(date.getDate() + diff);
    return date;
  };

  // Helper to format expiration time
  const getExpirationText = (expiresAt: number) => {
    if (!expiresAt || expiresAt === 0) return null;
    if (!currentEpoch) return "Loading expiration...";

    const remainingEpochs = expiresAt - currentEpoch;
    if (remainingEpochs <= 0) return "Expired";

    // Testnet: 1 Epoch = 1 Day
    // Mainnet: 1 Epoch = 14 Days (approx)
    // We assume Testnet for now as per config
    const daysRemaining = remainingEpochs;

    if (daysRemaining === 1) return "Expires in 1 day";
    return `Expires in ${daysRemaining} days`;
  };

  // Calculate epochs when duration changes
  useEffect(() => {
    let epochs = 1;
    const val = Math.max(1, Math.floor(durationValue)); // Ensure positive integer

    switch (durationUnit) {
      case "days": epochs = val; break;
      case "weeks": epochs = val * 7; break;
      case "months": epochs = val * 30; break;
      case "years": epochs = val * 365; break;
    }
    setStorageEpochs(epochs);
  }, [durationValue, durationUnit]);

  // Reset helper
  const reset = () => {
    setFiles([]);
    setUploadedBatch([]);
    setBlobId("");
    setStatus("Idle");
    setCurrentStep(0);
    setError("");
    setShowHistory(false);
    setRecipientAddress("");
    setUploadProgress(0);
    setRemainingTime(0);
    setIsPublic(false);
    setIsExpired(false);
    setDurationValue(1);
    setDurationUnit("days");
  };

  // Load user files from backend (files uploaded by user)
  const loadUserFiles = async () => {
    if (!account) return;
    try {
      const files = await getFilesByUploaderViaEvents(client, account.address);
      setUserFiles(files.sort((a, b) => b.uploadedAt - a.uploadedAt));
    } catch (e) {
      console.error("Failed to load files from blockchain", e);
    }
  };

  useEffect(() => {
    if (account && showHistory) {
        loadUserFiles();
    }
  }, [account, showHistory]);

  // Handle URL query params for shared files
  useEffect(() => {
    const sharedBlobId = searchParams.get("blobId");
    const sharedBlobIds = searchParams.get("blobIds");

    // Handle batch link (multiple files)
    if (sharedBlobIds) {
      const blobIdArray = sharedBlobIds.split(',').filter(id => id.trim());
      const fetchBatchFiles = async () => {
        try {
          const batchMetadata: { blobId: string, name: string, type: string, size: number }[] = [];

          for (const blobId of blobIdArray) {
            const fileRecord = await getFileByBlobId(client, blobId.trim());
            if (fileRecord) {
              batchMetadata.push({
                blobId: fileRecord.blobId,
                name: fileRecord.fileName,
                type: fileRecord.fileType,
                size: fileRecord.fileSize
              });

              // Set public flag based on first file (all should be same in a batch)
              if (batchMetadata.length === 1) {
                setIsPublic(fileRecord.isPublic);
              }
            }
          }

          if (batchMetadata.length > 0) {
            setUploadedBatch(batchMetadata);
            setBlobId(batchMetadata[0].blobId); // Set first for backward compatibility
          }
        } catch (e) {
          console.error("Failed to fetch batch files from URL", e);
        }
      };
      fetchBatchFiles();
    }
    // Handle single file link
    else if (sharedBlobId) {
      // Auto-trigger access if we have a blobId
      const fetchSharedFile = async () => {
        try {
          const fileRecord = await getFileByBlobId(client, sharedBlobId);
          if (fileRecord) {
            setBlobId(fileRecord.blobId);
            setFiles([{ name: fileRecord.fileName, type: fileRecord.fileType || "application/octet-stream" } as File]);
            setRecipientAddress(fileRecord.recipient);
            const isFilePublic = !!fileRecord.isPublic;
            setIsPublic(isFilePublic);
            
            // Mark for auto-download if public file (will be handled by separate useEffect)
            if (isFilePublic) {
              setAutoDownloadBlobId(sharedBlobId);
            }
          }
        } catch (e) {
          console.error("Failed to access shared file from blockchain", e);
          setError("Failed to load file metadata. The file may not exist or the blob ID is invalid.");
        }
      };
      fetchSharedFile();
    }
  }, [searchParams]);

  // Note: On-chain file records are immutable and cannot be deleted
  // Files stored on the blockchain are permanent

  // ----- Upload / Encryption Flow -----
  const handleUpload = async () => {
    if (files.length === 0 || !account) return;
    if (!isPublic && !recipientAddress) { setError("Please enter a recipient wallet address for private files."); return; }

    try {
      setError("");
      setStatus("Starting batch upload...");

      const uploadedFilesMetadata: { blobId: string, name: string, type: string, size: number }[] = [];
      const totalFiles = files.length;

      // Import dependencies dynamically
      const { encryptFileStreaming } = await import('../lib/seal/streaming-encryption');
      const { uploadToWalrus } = await import('../lib/walrus/client');

      // Process files sequentially to avoid browser resource exhaustion
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        let fileToUpload = file;

        // Update status - show which file is being processed
        setStatus(`Processing file ${i + 1} of ${totalFiles}: ${file.name}`);

        // 1. Encrypt if private
        if (!isPublic) {
          setStatus(`Encrypting file ${i + 1} of ${totalFiles}: ${file.name}`);
          const normalizedRecipient = normalizeSuiAddress(recipientAddress);
          const encryptedBlob = await encryptFileStreaming({
            file,
            recipientAddress: normalizedRecipient,
            onProgress: (progress) => {
              // Calculate weighted progress (50% encryption, 50% upload)
              const currentFileProgress = progress * 0.5;
              const batchProgress = Math.round(((i * 100) + currentFileProgress) / totalFiles);
              setUploadProgress(batchProgress);
              setStatus(`Encrypting file ${i + 1} of ${totalFiles}: ${file.name} (${progress}%)`);
            }
          });

          fileToUpload = new File([encryptedBlob], file.name, {
            type: file.type || "application/octet-stream"
          });
        }

        // 2. Upload to Walrus
        setStatus(`Uploading file ${i + 1} of ${totalFiles}: ${file.name}`);
        const newBlobId = await uploadToWalrus(fileToUpload, storageEpochs, (progress: number, timeRemaining: number) => {
          // Adjust progress for upload phase (50-100% of file progress)
          const currentFileProgress = 50 + (progress * 0.5);
          const batchProgress = Math.round(((i * 100) + currentFileProgress) / totalFiles);
          setUploadProgress(batchProgress);
          setRemainingTime(timeRemaining);
          setStatus(`Uploading file ${i + 1} of ${totalFiles}: ${file.name} (${progress}% - ${timeRemaining}s remaining)`);
        });

        uploadedFilesMetadata.push({
          blobId: newBlobId,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }

      setUploadProgress(100);
      setStatus("Finalizing storage on Walrus network...");

      // 3. Batch Register on Blockchain
      setStatus("⚠️ Please sign the transaction to store metadata for ALL files...");

      const { createBatchRegisterFileTransaction } = await import('../lib/sui/file-registry');

      const tx = createBatchRegisterFileTransaction(
        uploadedFilesMetadata,
        isPublic ? account.address : normalizeSuiAddress(recipientAddress),
        storageEpochs,
        isPublic
      );

      try {
        console.log("Executing batch transaction for", uploadedFilesMetadata.length, "files");
        console.log("Transaction details:", {
          files: uploadedFilesMetadata.map(f => ({ name: f.name, blobId: f.blobId })),
          recipient: isPublic ? account.address : normalizeSuiAddress(recipientAddress),
          storageEpochs,
          isPublic
        });
        
        const result = await signAndExecute({ transaction: tx });
        console.log("Transaction successful:", result);
        
        setCurrentStep(1);
        setStatus(`Success! ${totalFiles} files stored on Walrus & Blockchain.`);

        // Store metadata for success view
        setUploadedBatch(uploadedFilesMetadata);
        if (uploadedFilesMetadata.length > 0) {
          setBlobId(uploadedFilesMetadata[0].blobId);
        }
      } catch (txError: any) {
        console.error("Blockchain transaction failed:", txError);
        console.error("Error details:", {
          message: txError?.message,
          code: txError?.code,
          data: txError?.data,
          stack: txError?.stack
        });
        setError("⚠️ Files uploaded to Walrus but metadata NOT stored on blockchain. Transaction failed: " + (txError?.message || "Unknown error"));
        setCurrentStep(1);
        return;
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed.");
    }
  };

  // ----- Download Handler -----
  const handleDownload = async (targetBlobId?: string, fileName?: string, fileType?: string) => {
    // Use direct parameters if provided, otherwise fall back to state
    const downloadBlobId = targetBlobId || blobId;
    const downloadFileName = fileName || files[0]?.name || `walrus_file_${downloadBlobId.slice(0, 6)}`;
    const downloadFileType = fileType || files[0]?.type || "application/octet-stream";

    if (!downloadBlobId) return;
    if (isExpired) {
      setError("Cannot download: This file has expired.");
      return;
    }

    // Prevent blocking if user clicks multiple files quickly
    if (isDownloading) {
      console.log("Download already in progress, queuing new download...");
    }

    try {
      console.log("Downloading file:", { downloadBlobId, downloadFileName, downloadFileType });
      setIsDownloading(true);
      setStatus("Fetching file from Walrus...");

      // 1. Fetch metadata to check if public
      let isFilePublic = isPublic;
      let decryptRecipientAddress = recipientAddress;

      // Try to get metadata from Blockchain if not already known
      if (!decryptRecipientAddress && downloadBlobId) {
        try {
          const fileRecord = await getFileByBlobId(client, downloadBlobId);
          if (fileRecord) {
            isFilePublic = fileRecord.isPublic;
            decryptRecipientAddress = fileRecord.recipient;
            // Check expiration
            if (fileRecord.expiresAt > 0 && currentEpoch > 0 && fileRecord.expiresAt <= currentEpoch) {
              setIsExpired(true);
              setError("Cannot download: This file has expired.");
              return;
            }
          }
        } catch (e) {
          console.warn("Could not fetch file metadata", e);
        }
      }

      // Download using HTTP API
      const { downloadFromWalrus } = await import('../lib/walrus/client');
      const downloadedBlob = await downloadFromWalrus(downloadBlobId);

      let finalBlob = downloadedBlob;

      // If NOT public, decrypt
      if (!isFilePublic) {
        // Decrypt the file (assuming it's encrypted)
        if (!account) throw new Error("Please connect your wallet to decrypt this file.");

        const encryptedBytes = new Uint8Array(await downloadedBlob.arrayBuffer());

        setStatus("Creating session key...");
        // Normalize address for session key creation
        const normalizedAccountAddress = normalizeSuiAddress(account.address);
        const sessionKey = await SessionKey.create({
          address: normalizedAccountAddress,
          packageId: SEAL_PACKAGE_ID,
          ttlMin: 5,
          suiClient: client,
        });

        // ✅ CRITICAL: Sign the session key's personal message
        setStatus("Please sign the personal message in your wallet...");
        const { signature } = await signPersonalMessage({
          message: sessionKey.getPersonalMessage(),
        });
        sessionKey.setPersonalMessageSignature(signature);

        setStatus("Decrypting file...");

        // Fallback to current account address if still not found
        decryptRecipientAddress = decryptRecipientAddress || account.address;
        if (!decryptRecipientAddress) {
          throw new Error("Recipient address is required for decryption. Please ensure the file was encrypted for your wallet address.");
        }

        // Normalize addresses for comparison
        const normalizedAccount = normalizeSuiAddress(account.address);
        const normalizedRecipient = normalizeSuiAddress(decryptRecipientAddress);

        // ✅ CRITICAL: Verify that the current user is the recipient
        // The bottled_message access policy only allows the recipient to decrypt
        if (normalizedAccount !== normalizedRecipient) {
          throw new Error("Access is restricted. This is a privately shared file.");
        }

        const tx = new Transaction();
        // Set the sender to the recipient address (must match account.address)
        tx.setSender(normalizedAccount);
        tx.moveCall({
          target: `${SEAL_PACKAGE_ID}::${SEAL_MODULE}::seal_approve`,
          arguments: [tx.pure.vector("u8", fromHex(normalizedRecipient))],
        });

        // @ts-ignore
        const txBytes = await tx.build({ client, onlyTransactionKind: true });
        // @ts-ignore
        const decryptedBytes = await sealClient.decrypt({ data: encryptedBytes, sessionKey, txBytes });

        const decryptedArray = new Uint8Array(decryptedBytes);
        finalBlob = new Blob([decryptedArray], { type: downloadFileType });
      }

      let downloadName = downloadFileName;

      // Add timestamp to ensure browser treats each download as unique
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.setAttribute('data-downloadurl', `${finalBlob.type}:${downloadName}:${url}`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Small delay before revoking to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 100);
      setStatus("Download complete.");
    } catch (e: any) {
      console.error(e);
      setError("Download failed: " + (e.message || e.toString()));
    } finally {
      setIsDownloading(false);
    }
  };

  // Auto-download public files when accessed via shareable link
  useEffect(() => {
    if (autoDownloadBlobId && blobId === autoDownloadBlobId && isPublic && !isDownloading) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleDownload();
        setAutoDownloadBlobId(null); // Clear flag after triggering
      }, 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownloadBlobId, blobId, isPublic, isDownloading]);

  // Check expiration for files in uploadedBatch
  useEffect(() => {
    if (uploadedBatch.length > 0 && currentEpoch > 0) {
      // Check if any file in batch is expired (for display purposes)
      // Individual files will be checked during download
    }
  }, [uploadedBatch, currentEpoch]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center pt-32 pb-32 px-4 md:px-6 relative overflow-hidden bg-[#050505]">
      {/* Blob Animation Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] md:w-[900px] md:h-[900px]"
        >
          <motion.div 
            className="absolute inset-0"
            animate={{
              rotate: 360,
              scale: [1, 1.2, 0.9, 1.1, 1],
              x: [0, 50, -35, 60, -25, 0],
              y: [0, -45, 35, -55, 40, 0],
            }}
            transition={{
              rotate: { duration: 55, ease: "linear", repeat: Infinity },
              scale: { duration: 28, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              x: { duration: 36, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              y: { duration: 42, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[110px] md:blur-[150px] opacity-40 mix-blend-screen" />
          </motion.div>
        </motion.div>
      </div>
      
      <div className="relative z-10 w-full max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-6xl font-sans text-white mb-4 tracking-tight">Secure Transfer</h1>
            <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">Testnet Storage + Seal Encryption</p>
          </div>
          
          {/* Tab Navigation */}
          {account && (
            <div className="flex justify-center">
              <div className="inline-flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setShowHistory(false)}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                    !showHistory
                      ? 'bg-eco-accent text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                    showHistory
                      ? 'bg-eco-accent text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  History
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Upload Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

            {/* Main Content */}
            <AnimatePresence mode="wait">
              {!account && !blobId ? (
                <motion.div
                  key="wallet-not-connected"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16 bg-white/5 rounded-xl border-2 border-dashed border-white/10"
                >
                  <div className="mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-gray-400" size={32} />
                  </div>
                  <p className="text-white font-medium text-lg mb-2">Wallet Not Connected</p>
                  <p className="text-sm text-gray-400 mt-2 px-8">
                    Please connect your Sui Wallet (Testnet) to start uploading files.
                  </p>
                </motion.div>
              ) : showHistory ? (
                <motion.div
                  key="history-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Files List */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">My Uploads</h2>
                    <p className="text-xs text-gray-400">On-chain records are permanent</p>
                  </div>
                  {userFiles.length === 0 ? (
                    <p className="text-gray-400 text-center py-12">No files uploaded yet</p>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {userFiles.map((fileRecord) => (
                        <div key={fileRecord.blobId} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/10 hover:border-white/20 transition-all">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-white">{fileRecord.fileName}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {fileRecord.isPublic ? (
                                <span className="text-eco-accent font-semibold">Public File</span>
                              ) : (
                                <>To: {(fileRecord.recipient || fileRecord.recipientAddress || '').slice(0, 8)}...{(fileRecord.recipient || fileRecord.recipientAddress || '').slice(-6)}</>
                              )}
                              {' • '}{getEpochDate(fileRecord.uploadedAt || 0).toLocaleDateString()}
                              {fileRecord.expiresAt > 0 && (
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${(fileRecord.expiresAt - currentEpoch) <= 3
                                  ? "text-red-400 bg-red-500/10 border-red-500/20"
                                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                  }`}>
                                  {getExpirationText(fileRecord.expiresAt)}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setShareBlobId(fileRecord.blobId);
                                navigator.clipboard.writeText(fileRecord.blobId);
                                setTimeout(() => setShareBlobId(""), 2000);
                              }}
                              className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 border border-green-500/20 transition-all"
                              title="Copy blob ID to share"
                            >
                              {shareBlobId === fileRecord.blobId ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setBlobId(fileRecord.blobId);
                                setFiles([{ name: fileRecord.fileName, type: fileRecord.fileType || "application/octet-stream" } as File]);
                                setRecipientAddress((fileRecord as any).recipient || (fileRecord as any).recipientAddress || account?.address || "");
                                handleDownload();
                              }}
                              className="text-xs px-3 py-1.5 bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 border border-eco-accent/20 transition-all"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="upload-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                {/* Recipient Address Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <User size={12} />
                      Recipient Address (Sui / ETH / Sol)
                    </label>
                    {!isPublic && account && (
                      <button
                        onClick={() => setRecipientAddress(account.address)}
                        disabled={currentStep > 0}
                        className="px-3 py-1.5 text-xs bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 border border-white/10 whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <User size={12} />
                        Use My Address
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <textarea
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      disabled={currentStep > 0 || isPublic}
                      placeholder="0x..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-eco-accent/50 focus:bg-white/10 transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-wrap break-all"
                      style={{ wordBreak: 'break-all' }}
                    />
                    <div className="absolute inset-0 rounded-xl bg-eco-accent/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  {!isPublic && (
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Only this address will be able to decrypt the file.
                    </p>
                  )}
                </div>

            {/* Upload Type Toggle */}
                <div className="bg-white/5 p-1 rounded-xl flex border border-white/10">
              <button
                onClick={() => setIsPublic(false)}
                    disabled={currentStep > 0}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${!isPublic ? 'bg-eco-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private (Encrypted)
                </div>
              </button>
              <button
                onClick={() => setIsPublic(true)}
                    disabled={currentStep > 0}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${isPublic ? 'bg-eco-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Public (Shareable)
                </div>
              </button>
            </div>

                {/* File Selection */}
              <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Paperclip size={12} />
                    Attachments {files.length > 0 && `(${files.length})`}
                  </label>
                  {files.length === 0 ? (
                    <div
                      onClick={() => !currentStep && document.getElementById('file-input')?.click()}
                      className="border-2 border-dashed border-white/10 rounded-xl h-48 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group hover:bg-white/[0.07] hover:border-white/20 bg-white/5"
                    >
                  <input
                        id="file-input"
                        type="file"
                        multiple
                    disabled={currentStep > 0}
                        onChange={(e) => {
                          if (e.target.files) {
                            setFiles(Array.from(e.target.files));
                          }
                        }}
                        className="hidden"
                      />
                      <div className="p-4 rounded-full bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                        <UploadCloud size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-300 font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">Max file size 5GB (Zero-Knowledge Encrypted)</p>
                        <p className="text-xs text-gray-500 mt-1">Multiple files supported</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                      {files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded border border-white/10">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate text-white">{f.name}</span>
                            <span className="text-xs text-gray-400">({formatFileSize(f.size)})</span>
                          </div>
                          <button
                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            disabled={currentStep > 0}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

            {/* Storage Duration Selector */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Database size={14} className="text-eco-accent" />
                Storage Duration
              </label>
              
              {/* Preset Duration Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => { setDurationValue(1); setDurationUnit("days"); }}
                  disabled={currentStep > 0}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border ${
                    durationValue === 1 && durationUnit === "days"
                      ? "bg-eco-accent/20 text-eco-accent border-eco-accent/50"
                      : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  1 Day
                </button>
                <button
                  type="button"
                  onClick={() => { setDurationValue(7); setDurationUnit("days"); }}
                  disabled={currentStep > 0}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border ${
                    durationValue === 7 && durationUnit === "days"
                      ? "bg-eco-accent/20 text-eco-accent border-eco-accent/50"
                      : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => { setDurationValue(30); setDurationUnit("days"); }}
                  disabled={currentStep > 0}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border ${
                    durationValue === 30 && durationUnit === "days"
                      ? "bg-eco-accent/20 text-eco-accent border-eco-accent/50"
                      : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={() => { setDurationValue(1); setDurationUnit("years"); }}
                  disabled={currentStep > 0}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border ${
                    durationValue === 1 && durationUnit === "years"
                      ? "bg-eco-accent/20 text-eco-accent border-eco-accent/50"
                      : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  1 Year
                </button>
              </div>

              {/* Custom Duration Input */}
              <div className="relative bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex gap-2 items-stretch">
                  {/* Count Input */}
                  <div className="relative group">
                    <label className="absolute -top-2 left-2 px-1.5 text-[10px] font-mono text-gray-500 bg-[#0A0A0A] z-10">
                      Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        setDurationValue(val);
                      }}
                      disabled={currentStep > 0}
                      className="block w-28 text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-3 pt-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-eco-accent/50 focus:border-eco-accent/50 disabled:opacity-50 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none hover:bg-white/10"
                      placeholder="1"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setDurationValue(prev => Math.max(1, prev + 1))}
                        disabled={currentStep > 0}
                        className="w-4 h-3.5 flex items-center justify-center text-gray-400 hover:text-eco-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-t border border-white/10 bg-white/5 hover:bg-white/10"
                        tabIndex={-1}
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationValue(prev => Math.max(1, prev - 1))}
                        disabled={currentStep > 0}
                        className="w-4 h-3.5 flex items-center justify-center text-gray-400 hover:text-eco-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-b border border-white/10 border-t-0 bg-white/5 hover:bg-white/10"
                        tabIndex={-1}
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Unit Dropdown */}
                  <div className="relative flex-1 group">
                    <label className="absolute -top-2 left-2 px-1.5 text-[10px] font-mono text-gray-500 bg-[#0A0A0A] z-10">
                      Period
                    </label>
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      disabled={currentStep > 0}
                      className="block w-full text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-3 pt-4 pr-10 text-white focus:ring-2 focus:ring-eco-accent/50 focus:border-eco-accent/50 disabled:opacity-50 transition-all cursor-pointer appearance-none hover:bg-white/10"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'%3E%3Cpath d='M3.5 5.25L7 8.75L10.5 5.25' stroke='%23${durationUnit === 'days' ? '4A90E2' : durationUnit === 'weeks' ? '4A90E2' : durationUnit === 'months' ? '4A90E2' : '4A90E2'}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem top 50%',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="days" className="bg-[#0A0A0A] text-white py-2">Days</option>
                      <option value="weeks" className="bg-[#0A0A0A] text-white py-2">Weeks</option>
                      <option value="months" className="bg-[#0A0A0A] text-white py-2">Months</option>
                      <option value="years" className="bg-[#0A0A0A] text-white py-2">Years</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        durationUnit === 'days' ? 'bg-eco-accent' :
                        durationUnit === 'weeks' ? 'bg-eco-accent' :
                        durationUnit === 'months' ? 'bg-eco-accent' :
                        'bg-eco-accent'
                      }`}></div>
                    </div>
                  </div>
                </div>
                
                {/* Helper Text */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-eco-accent/60"></span>
                    <span>Selected: {durationValue} {durationUnit} ({storageEpochs} epochs)</span>
                  </p>
                </div>
              </div>

              {/* Info Footer */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Auto-deletes after expiration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-eco-accent animate-pulse" />
                  <span className="text-xs font-mono text-eco-accent font-semibold">
                    {storageEpochs} Epochs
                  </span>
                </div>
              </div>
            </div>

            {/* Public Info */}
            {isPublic && (
                  <div className="bg-eco-accent/10 text-eco-accent/90 p-4 rounded-xl text-sm flex items-start gap-3 border border-eco-accent/20">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Public File</p>
                      <p className="mt-1 text-eco-accent/80">This file will be stored on Walrus without encryption. Anyone with the Blob ID can access it.</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
                  <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl text-sm border border-red-500/20 break-words overflow-hidden">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="flex-1 break-words overflow-wrap-anywhere">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            {files.length > 0 && !uploadedBatch.length && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleUpload}
                      disabled={currentStep !== 0 || files.length === 0 || (!isPublic && !recipientAddress)}
                      className={`w-full py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                        files.length === 0 || (!isPublic && !recipientAddress) || currentStep !== 0
                          ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                          : 'bg-eco-accent text-white hover:bg-blue-600 hover:scale-[1.01] shadow-eco-accent/20'
                      }`}
                    >
                      {status.includes("Uploading") || status.includes("Processing") ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : currentStep > 0 ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Upload Complete</span>
                        </>
                      ) : (
                        <>
                    <UploadCloud className="w-5 h-5" />
                          <span>{isPublic ? `Upload ${files.length} Public File${files.length > 1 ? 's' : ''}` : `Encrypt & Upload ${files.length} File${files.length > 1 ? 's' : ''} to Walrus`}</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                </button>

                {/* Progress Bar */}
                {(status.includes("Uploading") || status.includes("Encrypting") || status.includes("Processing")) && (
                      <div className="space-y-2">
                        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <div
                            className="bg-eco-accent h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                        <div className="flex justify-between text-xs text-gray-400">
                      <span>{uploadProgress}% Complete</span>
                      <span>{remainingTime > 0 ? `~${remainingTime}s remaining` : status.includes("Encrypting") ? 'Encrypting...' : 'Processing...'}</span>
                    </div>
                    {/* Show current file being processed */}
                    {status.includes("Processing file") && (
                      <p className="text-xs text-gray-500 text-center mt-1">
                        {status.split(": ")[1] || status}
                      </p>
                    )}
                  </div>
                )}

                {/* Finalizing Status */}
                {status.includes("Finalizing") && (
                      <div className="flex items-center gap-2 text-xs text-eco-accent bg-eco-accent/10 p-3 rounded-xl border border-eco-accent/20">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing on Walrus network... this may take a moment.</span>
                  </div>
                )}

                {/* Storing on Blockchain Status */}
                {status.includes("Storing") && (
                      <div className="flex items-center gap-2 text-xs text-eco-accent bg-eco-accent/10 p-3 rounded-xl border border-eco-accent/20">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{status}</span>
                  </div>
                )}
              </div>
            )}

                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* Right Column: Matrix Animation / Success View */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
            
            <AnimatePresence mode="wait">
              {status.includes("Uploading") || status.includes("Encrypting") || status.includes("Storing") || status.includes("Finalizing") || status.includes("Processing") || status.includes("Starting") ? (
                <motion.div
                  key="matrix-animation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full"
                >
                  <MatrixAnimation 
                    active={true} 
                    message={status.includes("Encrypting") ? "ENCRYPTING" : status.includes("Uploading") ? "UPLOADING" : status.includes("Storing") ? "STORING" : status.includes("Processing") ? "PROCESSING" : "PROCESSING"}
                    packets={status.includes("Uploading") ? "SENDING" : status.includes("Storing") ? "REGISTERING" : status.includes("Encrypting") ? "ENCRYPTING" : "PROCESSING"}
                  />
                  {/* Display current status text */}
                  <div className="absolute bottom-4 left-0 right-0 px-6 z-20">
                    <p className="text-xs text-gray-400 font-mono text-center bg-black/50 px-3 py-2 rounded border border-white/10">
                      {status}
                    </p>
                  </div>
                </motion.div>
              ) : !blobId && uploadedBatch.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full flex flex-col items-center justify-center text-center py-16 min-h-[500px]"
                >
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <FileText className="text-gray-400" size={40} />
                  </div>
                  <h3 className="text-xl font-sans text-white mb-2">Ready to Transfer</h3>
                  <p className="text-sm text-gray-400 px-8">
                    Select a file and configure your transfer settings
                  </p>
                </motion.div>
              ) : blobId || uploadedBatch.length > 0 ? (
                <motion.div
                  key="success-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="space-y-8 max-h-[800px] overflow-y-auto"
                >
                  {/* Success Header */}
                  <div className="text-center space-y-4">
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        duration: 0.8,
                        delay: 0.1
                      }}
                      className="relative mx-auto w-32 h-32 mb-6"
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-eco-accent/20 rounded-full blur-2xl animate-pulse" />
                      {/* Icon container */}
                      <div className="relative w-full h-full bg-gradient-to-br from-eco-accent/20 to-eco-accent/5 rounded-full flex items-center justify-center border border-eco-accent/30 backdrop-blur-sm">
                        <CheckCircle2 size={64} className="text-eco-accent" />
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-2"
                    >
                      <h3 className="text-3xl md:text-4xl font-sans text-white font-light tracking-tight">
                        Transfer Complete
                      </h3>
                      <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">
                        {uploadedBatch.length > 0 ? uploadedBatch.length : 1} {(uploadedBatch.length > 0 ? uploadedBatch.length : 1) === 1 ? 'file' : 'files'} {isPublic ? 'publicly' : 'securely'} stored on Walrus
                      </p>
                    </motion.div>
                  </div>

                  {/* Batch Actions */}
                  {uploadedBatch.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-3"
                    >
                      {/* Share All Files Button (For Public Files) */}
                      {isPublic && (
                        <div className="bg-eco-accent/10 border border-eco-accent/20 rounded-xl p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-eco-accent flex items-center gap-2">
                              <Share2 className="w-4 h-4" />
                              Share All Files ({uploadedBatch.length} files)
                            </p>
                            <button
                              onClick={() => {
                                const blobIds = uploadedBatch.map(f => f.blobId).join(',');
                                const link = `${window.location.origin}?blobIds=${blobIds}`;
                                navigator.clipboard.writeText(link);
                                setShareBlobId("batch-link");
                                setTimeout(() => setShareBlobId(""), 2000);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-eco-accent text-white rounded-lg hover:bg-eco-accent/80 transition-all"
                              title="Copy Batch Link"
                            >
                              {shareBlobId === "batch-link" ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  Copy Batch Link
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-eco-accent/80">
                            Recipients can view and download all {uploadedBatch.length} files from this single link
                          </p>
                        </div>
                      )}

                    </motion.div>
                  )}

                  {/* Batch File List - Blob IDs Only */}
                  {uploadedBatch.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-3 max-h-60 overflow-y-auto"
                    >
                      {uploadedBatch.map((fileItem, idx) => (
                        <div key={fileItem.blobId} className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono text-eco-accent break-all select-all leading-relaxed">
                                {fileItem.blobId}
                              </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(fileItem.blobId);
                                  setShareBlobId(fileItem.blobId);
                                  setTimeout(() => setShareBlobId(""), 2000);
                                }}
                                className="p-1.5 text-xs bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 transition-all"
                                title="Copy Blob ID"
                              >
                                {shareBlobId === fileItem.blobId ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </button>
                              {isPublic && (
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}?blobId=${fileItem.blobId}`;
                                    navigator.clipboard.writeText(link);
                                    setShareBlobId("link-" + fileItem.blobId);
                                    setTimeout(() => setShareBlobId(""), 2000);
                                  }}
                                  className="p-1.5 text-xs bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 transition-all"
                                  title="Copy Link"
                                >
                                  {shareBlobId === "link-" + fileItem.blobId ? <CheckCircle className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Single File View (Backward Compatibility) */}
                  {uploadedBatch.length === 0 && blobId && (
                    <>
                      {/* Blob ID Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-eco-accent animate-pulse" />
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                              Blob ID
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(blobId);
                              setShareBlobId(blobId);
                              setTimeout(() => setShareBlobId(""), 2000);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 border border-eco-accent/20 transition-all font-medium"
                            title="Copy blob ID"
                          >
                            {shareBlobId === blobId ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <p className="text-xs font-mono text-eco-accent break-all select-all leading-relaxed">
                            {blobId}
                          </p>
                        </div>
                      </motion.div>

                      {/* Share Link & QR Code (For Public Files) */}
                      {isPublic && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-6 backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-gray-400" />
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                                Shareable Link
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}?blobId=${blobId}`;
                                navigator.clipboard.writeText(link);
                                setShareBlobId("link-" + blobId);
                                setTimeout(() => setShareBlobId(""), 2000);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-eco-accent/10 text-eco-accent rounded-lg hover:bg-eco-accent/20 border border-eco-accent/20 transition-all font-medium"
                              title="Copy Link"
                            >
                              {shareBlobId === "link-" + blobId ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <p className="text-xs font-mono text-eco-accent break-all select-all leading-relaxed">
                              {typeof window !== 'undefined' ? `${window.location.origin}?blobId=${blobId}` : `.../?blobId=${blobId}`}
                            </p>
                          </div>

                          <div className="flex flex-col items-center gap-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-gray-400" />
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                                Scan to Download
                              </p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                              <QRCodeSVG
                                value={typeof window !== 'undefined' ? `${window.location.origin}?blobId=${blobId}` : blobId}
                                size={180}
                                level={"M"}
                                bgColor="transparent"
                                fgColor="#ffffff"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Action Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="pt-4"
                  >
                    <button
                      onClick={reset}
                      className="w-full px-8 py-4 bg-white/5 text-white rounded-xl font-medium hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 group"
                    >
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      <span>Send More Files</span>
                    </button>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />
      
      {/* Seamless Footer Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
    </main>
  );
}

export default function Upload() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Loading Walrus Uploader...</p>
        </div>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
