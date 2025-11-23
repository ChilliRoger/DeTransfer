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
  const [file, setFile] = useState<File | null>(null);
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

  // Reset helper
  const reset = () => {
    setFile(null);
    setBlobId("");
    setStatus("Idle");
    setCurrentStep(0);
    setError("");
    setShowHistory(false);
    setRecipientAddress("");
    setUploadProgress(0);
    setRemainingTime(0);
    setIsPublic(false);
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
    if (sharedBlobId) {
      // Auto-trigger access if we have a blobId
      const fetchSharedFile = async () => {
        try {
          const fileRecord = await getFileByBlobId(client, sharedBlobId);
          if (fileRecord) {
            setBlobId(fileRecord.blobId);
            setFile({ name: fileRecord.fileName, type: fileRecord.fileType || "application/octet-stream" } as File);
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
    if (!file || !account) return;
    if (!isPublic && !recipientAddress) { setError("Please enter a recipient wallet address for private files."); return; }

    try {
      setError("");
      let fileToUpload = file;

      if (!isPublic) {
        setStatus("Encrypting file...");
        // Encrypt file data
        const buffer = new Uint8Array(await file.arrayBuffer());
        // Normalize recipient address to ensure consistent format
        const normalizedRecipient = normalizeSuiAddress(recipientAddress);
        const { encryptedObject } = await sealClient.encrypt({
          packageId: SEAL_PACKAGE_ID,
          id: normalizedRecipient,
          threshold: 1,
          data: buffer,
        });

        // Create encrypted file for upload
        fileToUpload = new File([encryptedObject], file.name, {
          type: file.type || "application/octet-stream"
        });
      }

      setStatus("Uploading to Walrus...");

      // Upload directly to Walrus HTTP API
      const { uploadToWalrus } = await import('@/app/lib/walrus/client');
      const newBlobId = await uploadToWalrus(fileToUpload, (progress, timeRemaining) => {
        setUploadProgress(progress);
        setRemainingTime(timeRemaining);
        if (progress === 100) {
          setStatus("Finalizing storage on Walrus network...");
        } else {
          setStatus(`Uploading: ${progress}% - ${timeRemaining}s remaining`);
        }
      });

      setBlobId(newBlobId);

      // Save metadata on blockchain
      setStatus("Storing metadata on blockchain...");
      const tx = createRegisterFileTransaction(
        newBlobId,
        isPublic ? account.address : normalizeSuiAddress(recipientAddress),
        file.name,
        file.type || "application/octet-stream",
        file.size,
          isPublic
      );

      try {
        await signAndExecute({ transaction: tx });
        setCurrentStep(1);
        setStatus(isPublic ? "Success! Public file stored on Walrus & Blockchain." : "Success! Encrypted file stored on Walrus & Blockchain.");
      } catch (txError: any) {
        // User rejected the transaction or it failed
        console.error("Blockchain transaction failed:", txError);
        setError(
          "⚠️ File uploaded to Walrus but metadata NOT stored on blockchain. " +
          "You rejected the transaction or it failed. " +
          "The file exists at blob ID: " + newBlobId + " but won't appear in your history."
        );
        // Still set blobId so user can manually access it
      setCurrentStep(1);
        return;
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed.");
    }
  };

  // ----- Download Handler -----
  const handleDownload = async () => {
    if (!blobId) return;
    try {
      setIsDownloading(true);
      setStatus("Fetching file from Walrus...");

      // 1. Fetch metadata to check if public
      let isFilePublic = isPublic;
      let decryptRecipientAddress = recipientAddress;

      // Try to get metadata from blockchain if not already known
      if (!decryptRecipientAddress && blobId) {
        try {
          const fileRecord = await getFileByBlobId(client, blobId);
          if (fileRecord) {
            isFilePublic = !!fileRecord.isPublic;
            decryptRecipientAddress = fileRecord.recipient;
          }
        } catch (e) {
          console.warn("Could not fetch file metadata from blockchain", e);
        }
      }

      // Download using HTTP API with progress tracking
      const { downloadFromWalrus } = await import('@/app/lib/walrus/client');
      setDownloadProgress(0);
      const downloadedBlob = await downloadFromWalrus(blobId, (progress) => {
        setDownloadProgress(progress);
        setStatus(`Downloading: ${progress}%`);
      });

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
        setDownloadProgress(50); // Download complete, now decrypting

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
          throw new Error("Access denied: This file was encrypted for a different wallet address. Only the intended recipient can decrypt this file.");
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
        finalBlob = new Blob([decryptedArray], { type: file?.type || "application/octet-stream" });
      }

      let downloadName = file?.name || `walrus_file_${blobId.slice(0, 6)}`;

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadProgress(100);
      setStatus("Download complete.");
    } catch (e: any) {
      console.error(e);
      // Sanitize error message - remove sensitive details
      let errorMessage = "Download failed";
      if (e.message) {
        if (e.message.includes("Access denied")) {
          errorMessage = "Access denied: This file was encrypted for a different wallet address. Only the intended recipient can decrypt this file.";
        } else if (e.message.includes("recipient") || e.message.includes("address")) {
          errorMessage = "Access denied: You don't have permission to decrypt this file.";
        } else if (e.message.includes("network") || e.message.includes("fetch")) {
          errorMessage = "Network error: Please check your connection and try again.";
        } else {
          errorMessage = "Download failed: " + e.message.replace(/0x[a-fA-F0-9]{64}/g, "[address]").substring(0, 100);
        }
      }
      setError(errorMessage);
      setDownloadProgress(0);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1000);
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
                              {' • '}{new Date((fileRecord.uploadedAt || 0) * 1000).toLocaleDateString()}
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
                                setFile({ name: fileRecord.fileName, type: fileRecord.fileType || "application/octet-stream" } as File);
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
                    Attachment
                  </label>
                  {!file ? (
                    <div
                      onClick={() => !currentStep && document.getElementById('file-input')?.click()}
                      className="border-2 border-dashed border-white/10 rounded-xl h-48 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group hover:bg-white/[0.07] hover:border-white/20 bg-white/5"
                    >
                  <input
                        id="file-input"
                        type="file"
                    disabled={currentStep > 0}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="p-4 rounded-full bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                        <UploadCloud size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-300 font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">Max file size 5GB (Zero-Knowledge Encrypted)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-eco-accent/10 rounded-lg flex items-center justify-center text-eco-accent">
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium truncate max-w-[200px] md:max-w-[300px]">{file.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                  <button
                        onClick={() => setFile(null)}
                    disabled={currentStep > 0}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                        <X size={18} />
                  </button>
                    </div>
                  )}
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
            {file && !blobId && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleUpload}
                      disabled={currentStep !== 0 || !file || (!isPublic && !recipientAddress)}
                      className={`w-full py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                        !file || (!isPublic && !recipientAddress) || currentStep !== 0
                          ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                          : 'bg-eco-accent text-white hover:bg-blue-600 hover:scale-[1.01] shadow-eco-accent/20'
                      }`}
                    >
                      {status.includes("Uploading") ? (
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
                          <span>{isPublic ? 'Upload Public File' : 'Encrypt & Upload to Walrus'}</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                </button>

                {/* Progress Bar */}
                {status.includes("Uploading") && (
                      <div className="space-y-2">
                        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <div
                            className="bg-eco-accent h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                        <div className="flex justify-between text-xs text-gray-400">
                      <span>{uploadProgress}% Uploaded</span>
                      <span>{remainingTime > 0 ? `~${remainingTime}s remaining` : 'Calculating...'}</span>
                    </div>
                  </div>
                )}

                {/* Finalizing Status */}
                {status.includes("Finalizing") && (
                      <div className="flex items-center gap-2 text-xs text-eco-accent bg-eco-accent/10 p-3 rounded-xl border border-eco-accent/20">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing on Walrus network... this may take a moment.</span>
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
              {status.includes("Uploading") || status.includes("Encrypting") || status.includes("Storing") || status.includes("Finalizing") ? (
                <motion.div
                  key="matrix-animation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full"
                >
                  <MatrixAnimation 
                    active={true} 
                    message={status.includes("Encrypting") ? "ENCRYPTING" : status.includes("Uploading") ? "UPLOADING" : status.includes("Storing") ? "STORING" : "PROCESSING"}
                    packets={status.includes("Uploading") ? "SENDING" : status.includes("Storing") ? "REGISTERING" : "PROCESSING"}
                  />
                </motion.div>
              ) : !blobId ? (
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
              ) : blobId ? (
                <motion.div
                  key="success-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="space-y-8"
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
                        Your {isPublic ? 'public' : 'encrypted'} file has been stored on Walrus
                      </p>
                    </motion.div>
                  </div>

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
                      <span>Send Another File</span>
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
