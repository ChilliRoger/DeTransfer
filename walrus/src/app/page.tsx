"use client";

import React, { useState, useEffect, Suspense } from "react";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, normalizeSuiAddress } from "@mysten/sui/utils";

import { SealClient, SessionKey } from "@mysten/seal";
import { UploadCloud, CheckCircle, Loader2, AlertCircle, FileText, Download, Lock, Trash2, Share2, Copy, Search, QrCode, Link as LinkIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";
import {
  createRegisterFileTransaction,
  getFilesByUploaderViaEvents,
  getFilesByRecipient,
  getFileByBlobId,
} from "../lib/sui";

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

function HomeContent() {
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
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<"uploads" | "shared">("uploads");
  const [shareBlobId, setShareBlobId] = useState("");
  const [accessBlobId, setAccessBlobId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const [isPublic, setIsPublic] = useState(false);
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
    setUploadedBatch([]);
  };

  // Load user files from blockchain (files uploaded by user)
  const loadUserFiles = async () => {
    if (!account) return;
    try {
      const files = await getFilesByUploaderViaEvents(client, account.address);
      setUserFiles(files.sort((a, b) => b.uploadedAt - a.uploadedAt));
    } catch (e) {
      console.error("Failed to load files from blockchain", e);
    }
  };

  // Load shared files from blockchain (files shared with user as recipient)
  const loadSharedFiles = async () => {
    if (!account) return;
    try {
      const normalizedAddress = normalizeSuiAddress(account.address);
      const files = await getFilesByRecipient(client, normalizedAddress);
      setSharedFiles(files); // Already sorted by object version in SDK
    } catch (e) {
      console.error("Failed to load shared files from blockchain", e);
    }
  };

  useEffect(() => {
    if (account && showHistory) {
      if (historyTab === "uploads") {
        loadUserFiles();
      } else {
        loadSharedFiles();
      }
    }
  }, [account, showHistory, historyTab]);

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
      setAccessBlobId(sharedBlobId);
      // Auto-trigger access if we have a blobId
      const fetchSharedFile = async () => {
        try {
          const fileRecord = await getFileByBlobId(client, sharedBlobId);
          if (fileRecord) {
            setBlobId(fileRecord.blobId);
            setFiles([{ name: fileRecord.fileName, type: fileRecord.fileType } as File]);
            setRecipientAddress(fileRecord.recipient);
            setIsPublic(fileRecord.isPublic);
            setAccessBlobId("");
          }
        } catch (e) {
          console.error("Failed to access shared file from URL", e);
        }
      };
      fetchSharedFile();
    }
  }, [searchParams]);

  // ----- Delete Handlers (Removed for On-Chain) -----
  const handleDeleteFile = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    // On-chain deletion requires object ownership and gas. 
    // For Phase 1, we'll just remove it from the local view or show a message.
    alert("File deletion from blockchain is not yet supported in the UI.");
  };

  const handleClearAllFiles = async () => {
    if (!account) return;
    if (!confirm("Clear all files for this wallet?")) return;
    alert("Clearing all files from blockchain is not yet supported in the UI.");
  };

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

        // Update status
        setStatus(`Processing file ${i + 1} of ${totalFiles}: ${file.name}`);

        // 1. Encrypt if private
        if (!isPublic) {
          const normalizedRecipient = normalizeSuiAddress(recipientAddress);
          const encryptedBlob = await encryptFileStreaming({
            file,
            recipientAddress: normalizedRecipient,
            onProgress: (progress) => {
              // Calculate weighted progress (50% encryption, 50% upload)
              const currentFileProgress = progress * 0.5;
              const batchProgress = Math.round(((i * 100) + currentFileProgress) / totalFiles);
              setUploadProgress(batchProgress);
            }
          });

          fileToUpload = new File([encryptedBlob], file.name, {
            type: file.type || "application/octet-stream"
          });
        }

        // 2. Upload to Walrus
        const newBlobId = await uploadToWalrus(fileToUpload, storageEpochs, (progress, timeRemaining) => {
          // Adjust progress for upload phase (50-100% of file progress)
          const currentFileProgress = 50 + (progress * 0.5);
          const batchProgress = Math.round(((i * 100) + currentFileProgress) / totalFiles);
          setUploadProgress(batchProgress);
          setRemainingTime(timeRemaining);
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
        await signAndExecute({ transaction: tx });
        setCurrentStep(1);
        setStatus(`Success! ${totalFiles} files stored on Walrus & Blockchain.`);

        // Store metadata for success view
        setUploadedBatch(uploadedFilesMetadata);
        if (uploadedFilesMetadata.length > 0) {
          setBlobId(uploadedFilesMetadata[0].blobId);
        }
      } catch (txError: any) {
        console.error("Blockchain transaction failed:", txError);
        setError("⚠️ Files uploaded to Walrus but metadata NOT stored on blockchain. Transaction failed.");
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
    if (isExpired) {
      setError("Cannot download: This file has expired.");
      return;
    }

    try {
      setIsDownloading(true);
      setStatus("Fetching file from Walrus...");

      // 1. Fetch metadata to check if public
      let isFilePublic = isPublic;
      let decryptRecipientAddress = recipientAddress;

      // Try to get metadata from Blockchain if not already known
      if (!decryptRecipientAddress && blobId) {
        try {
          const fileRecord = await getFileByBlobId(client, blobId);
          if (fileRecord) {
            isFilePublic = fileRecord.isPublic;
            decryptRecipientAddress = fileRecord.recipient;
          }
        } catch (e) {
          console.warn("Could not fetch file metadata", e);
        }
      }

      // Download using HTTP API
      const { downloadFromWalrus } = await import('../lib/walrus/client');
      const downloadedBlob = await downloadFromWalrus(blobId);

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
        finalBlob = new Blob([decryptedArray], { type: files[0]?.type || "application/octet-stream" });
      }

      let downloadName = files[0]?.name || `walrus_file_${blobId.slice(0, 6)}`;

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("Download complete.");
    } catch (e: any) {
      console.error(e);
      setError("Download failed: " + (e.message || e.toString()));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">Walrus Uploader</h1>
            <p className="text-xs text-slate-500 mt-1">Testnet Storage + Seal Encryption</p>
          </div>
          <div className="flex items-center gap-3">
            {account && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                {showHistory ? 'Upload' : 'History'}
              </button>
            )}
            <ConnectButton />
          </div>
        </div>

        {/* Main Content */}
        {!account && !blobId ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <div className="mx-auto w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
              <FileText className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Wallet Not Connected</p>
            <p className="text-xs text-slate-400 mt-2 px-8">
              Please connect your Sui Wallet (Testnet) to start uploading files.
            </p>
          </div>
        ) : showHistory ? (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => {
                  setHistoryTab("uploads");
                  loadUserFiles();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${historyTab === "uploads"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                My Uploads ({userFiles.length})
              </button>
              <button
                onClick={() => {
                  setHistoryTab("shared");
                  loadSharedFiles();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${historyTab === "shared"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                Shared with Me ({sharedFiles.length})
              </button>
            </div>

            {/* Access Shared File by BlobId */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-blue-600" />
                <label className="text-sm font-medium text-blue-900">Access Shared File</label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessBlobId}
                  onChange={(e) => setAccessBlobId(e.target.value)}
                  placeholder="Enter blob ID (0x...)"
                  className="flex-1 text-sm border border-blue-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={async () => {
                    if (!accessBlobId) return;
                    try {
                      const fileRecord = await getFileByBlobId(client, accessBlobId);
                      if (fileRecord) {
                        setBlobId(fileRecord.blobId);
                        setFiles([{ name: fileRecord.fileName, type: fileRecord.fileType } as File]);
                        setRecipientAddress(fileRecord.recipient);
                        setAccessBlobId("");
                        await handleDownload();
                      } else {
                        setError("File not found");
                      }
                    } catch (e) {
                      setError("Failed to access file");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Access
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">Enter a blob ID to access a file shared with you</p>
            </div>

            {/* Files List */}
            {historyTab === "uploads" ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">My Uploads</h2>
                </div>
                {userFiles.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No files uploaded yet</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userFiles.map((fileRecord, idx) => (
                      <div key={`${fileRecord.blobId}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{fileRecord.fileName}</p>
                          <p className="text-xs text-slate-500">
                            {fileRecord.isPublic ? (
                              <span className="text-blue-600 font-semibold">Public File</span>
                            ) : (
                              <>To: {fileRecord.recipient.slice(0, 8)}...{fileRecord.recipient.slice(-6)}</>
                            )}
                            {' • '}{getEpochDate(fileRecord.uploadedAt).toLocaleDateString()}
                            {fileRecord.expiresAt > 0 && (
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${(fileRecord.expiresAt - currentEpoch) <= 3
                                ? "text-red-600 bg-red-50 border-red-100"
                                : "text-amber-600 bg-amber-50 border-amber-100"
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
                            className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
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
                              setFiles([{ name: fileRecord.fileName, type: fileRecord.fileType } as File]);
                              setRecipientAddress(fileRecord.recipient || account?.address || "");
                              handleDownload();
                            }}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Shared with Me</h2>
                </div>
                {sharedFiles.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No files shared with you yet</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sharedFiles.map((fileRecord, idx) => (
                      <div key={`${fileRecord.blobId}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{fileRecord.fileName}</p>
                          <p className="text-xs text-slate-500">
                            From: {fileRecord.uploader.slice(0, 8)}...{fileRecord.uploader.slice(-6)} • {getEpochDate(fileRecord.uploadedAt).toLocaleDateString()}
                            {fileRecord.expiresAt > 0 && (
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${(fileRecord.expiresAt - currentEpoch) <= 3
                                ? "text-red-600 bg-red-50 border-red-100"
                                : "text-amber-600 bg-amber-50 border-amber-100"
                                }`}>
                                {getExpirationText(fileRecord.expiresAt)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setBlobId(fileRecord.blobId);
                              setFiles([{ name: fileRecord.fileName, type: fileRecord.fileType } as File]);
                              setRecipientAddress(fileRecord.recipient);
                              handleDownload();
                            }}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Select Files</label>
              <input
                type="file"
                multiple
                disabled={currentStep > 0}
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                  }
                }}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-2"
              />
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 border border-slate-200">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500"
                      disabled={currentStep > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Storage Duration Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Storage Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className="block w-24 text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="block flex-1 text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Auto-deletes after period
                </span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {storageEpochs} Epochs
                </span>
              </div>
            </div>

            {/* Upload Type Toggle */}
            <div className="bg-slate-100 p-1 rounded-lg flex mb-4">
              <button
                onClick={() => setIsPublic(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${!isPublic ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private (Encrypted)
                </div>
              </button>
              <button
                onClick={() => setIsPublic(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${isPublic ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Public (Shareable)
                </div>
              </button>
            </div>

            {/* Recipient Address (Only for Private) */}
            {!isPublic && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Recipient Wallet Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    disabled={currentStep > 0}
                    placeholder="0x..."
                    className="block w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setRecipientAddress(account?.address || "")}
                    className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                    disabled={currentStep > 0}
                  >
                    Use My Address
                  </button>
                </div>
                <p className="text-xs text-slate-500">Only this address will be able to decrypt the file.</p>
              </div>
            )}

            {/* Public Info */}
            {isPublic && (
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Public File</p>
                  <p className="mt-1 text-blue-700/80">This file will be stored on Walrus without encryption. Anyone with the Blob ID can access it.</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            {files.length > 0 && !uploadedBatch.length && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleUpload}
                  disabled={currentStep !== 0}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${currentStep > 0
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-blue-600 bg-blue-50 text-blue-700 hover:shadow-md"}`}
                >
                  <span className="flex items-center gap-3 font-semibold">
                    <UploadCloud className="w-5 h-5" />
                    {isPublic ? 'Upload Public File' : 'Encrypt & Upload to Walrus'}
                  </span>
                  {status.includes("Uploading") && <Loader2 className="animate-spin w-5 h-5" />}
                  {currentStep > 0 && <CheckCircle className="w-5 h-5" />}
                </button>

                {/* Progress Bar */}
                {status.includes("Uploading") && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{uploadProgress}% Uploaded</span>
                      <span>{remainingTime > 0 ? `~${remainingTime}s remaining` : 'Calculating...'}</span>
                    </div>
                  </div>
                )}

                {/* Finalizing Status */}
                {status.includes("Finalizing") && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing on Walrus network... this may take a moment.</span>
                  </div>
                )}
              </div>
            )}

            {/* Success View */}
            {uploadedBatch.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">Upload Successful!</h3>
                  <p className="text-sm text-emerald-700">
                    {uploadedBatch.length} {uploadedBatch.length === 1 ? 'file' : 'files'} {isPublic ? 'publicly' : 'securely'} stored on Walrus & Blockchain.
                  </p>
                </div>

                {/* Share All Files Button (For Public Files) */}
                {isPublic && uploadedBatch.length > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
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
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="Copy Batch Link"
                      >
                        {shareBlobId === "batch-link" ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4" />
                            Copy Batch Link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-blue-700">
                      Recipients can view and download all {uploadedBatch.length} files from this single link
                    </p>
                  </div>
                )}

                {/* Batch File List */}
                <div className="space-y-3 max-h-60 overflow-y-auto text-left">
                  {uploadedBatch.map((fileItem, idx) => (
                    <div key={fileItem.blobId} className="bg-white p-3 rounded border border-emerald-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate max-w-[200px]" title={fileItem.name}>
                          {fileItem.name}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(fileItem.blobId);
                              setShareBlobId(fileItem.blobId);
                              setTimeout(() => setShareBlobId(""), 2000);
                            }}
                            className="p-1.5 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
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
                              className="p-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                              title="Copy Link"
                            >
                              {shareBlobId === "link-" + fileItem.blobId ? <CheckCircle className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 break-all bg-slate-50 p-1 rounded">
                        {fileItem.blobId}
                      </p>
                      <button
                        onClick={() => {
                          setBlobId(fileItem.blobId);
                          setFiles([{ name: fileItem.name, type: fileItem.type } as File]);
                          handleDownload();
                        }}
                        className="mt-2 w-full py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setFiles([]);
                    setUploadedBatch([]);
                    setBlobId("");
                    setCurrentStep(0);
                    setStatus("");
                    setUploadProgress(0);
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-800 underline mt-4"
                >
                  Upload More Files
                </button>
              </div>
            )}

            {/* Expiration Warning for Download View */}
            {blobId && !showHistory && (
              <div className="mt-4 text-center">
                {/* We need to fetch metadata if not available, but for now we rely on what we have */}
                {/* Ideally we would pass the expiration from the URL or fetch it */}
              </div>
            )}

            {blobId && (
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || isExpired}
                  className={`flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-70 ${isExpired ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExpired ? 'File Expired' : (isPublic ? 'Download File' : 'Decrypt & Download')}
                </button>
                <button
                  onClick={reset}
                  className="text-sm font-medium text-emerald-700 bg-emerald-100 px-4 py-2 rounded-lg hover:bg-emerald-200 transition-colors"
                >
                  New Upload
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Status */}
        <div className="text-center border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</span>
          <p className="text-sm font-mono text-slate-600 mt-1">{status}</p>
        </div>
      </div>
    </main>
  );
}


export default function WalrusPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
} 
