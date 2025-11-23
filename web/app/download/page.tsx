"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { motion } from "framer-motion";
import { Download, FileText, AlertCircle, Loader2, CheckCircle, Clock, HardDrive, User, Copy, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { getFileByBlobId } from "../lib/sui";
import { downloadFromWalrus } from "../lib/walrus/client";

const client = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

interface FileMetadata {
  blobId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  expiresAt: number;
  isPublic: boolean;
  uploader: string;
  recipient: string;
}

function DownloadContent() {
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string>("");

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

  // Load files from query params
  useEffect(() => {
    const loadFiles = async () => {
      const blobId = searchParams.get("blobId");
      const blobIds = searchParams.get("blobIds");

      if (!blobId && !blobIds) {
        setError("No file ID provided. Please use a valid download link.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const ids = blobIds ? blobIds.split(',').filter(id => id.trim()) : [blobId!];
        const fileMetadata: FileMetadata[] = [];

        for (const id of ids) {
          const fileRecord = await getFileByBlobId(client, id.trim());
          if (fileRecord) {
            // Only allow public files to be downloaded without wallet
            if (!fileRecord.isPublic) {
              setError("This file is encrypted and requires wallet authentication. Please use the upload page to access it.");
              setLoading(false);
              return;
            }

            fileMetadata.push({
              blobId: fileRecord.blobId,
              fileName: fileRecord.fileName,
              fileType: fileRecord.fileType || "application/octet-stream",
              fileSize: fileRecord.fileSize,
              uploadedAt: fileRecord.uploadedAt,
              expiresAt: fileRecord.expiresAt,
              isPublic: fileRecord.isPublic,
              uploader: fileRecord.uploader,
              recipient: fileRecord.recipient,
            });
          } else {
            setError(`File with ID ${id} not found. It may have been deleted or the ID is invalid.`);
            setLoading(false);
            return;
          }
        }

        setFiles(fileMetadata);
      } catch (e: any) {
        console.error("Failed to load files", e);
        setError("Failed to load file metadata: " + (e.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [searchParams]);

  // Check if file is expired
  const isExpired = (expiresAt: number) => {
    if (!expiresAt || expiresAt === 0) return false;
    if (!currentEpoch) return false;
    return expiresAt <= currentEpoch;
  };

  // Get expiration text
  const getExpirationText = (expiresAt: number) => {
    if (!expiresAt || expiresAt === 0) return "No expiration";
    if (!currentEpoch) return "Loading...";
    
    if (isExpired(expiresAt)) return "Expired";
    
    const remainingEpochs = expiresAt - currentEpoch;
    if (remainingEpochs === 1) return "Expires in 1 day";
    return `Expires in ${remainingEpochs} days`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Handle download
  const handleDownload = async (file: FileMetadata) => {
    if (downloadingIds.has(file.blobId)) return;
    if (isExpired(file.expiresAt)) {
      setError("Cannot download: This file has expired.");
      return;
    }

    try {
      setDownloadingIds(prev => new Set(prev).add(file.blobId));
      setError("");
      setDownloadProgress(prev => ({ ...prev, [file.blobId]: 0 }));

      const blob = await downloadFromWalrus(file.blobId, (progress) => {
        setDownloadProgress(prev => ({ ...prev, [file.blobId]: progress }));
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      setDownloadProgress(prev => ({ ...prev, [file.blobId]: 100 }));
    } catch (e: any) {
      console.error("Download failed", e);
      setError("Download failed: " + (e.message || "Unknown error"));
    } finally {
      setTimeout(() => {
        setDownloadingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.blobId);
          return newSet;
        });
      }, 1000);
    }
  };

  // Copy blob ID
  const copyBlobId = (blobId: string) => {
    navigator.clipboard.writeText(blobId);
    setCopiedId(blobId);
    setTimeout(() => setCopiedId(""), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center pt-32 pb-32 px-4 md:px-6 relative overflow-hidden bg-[#050505]">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] md:w-[900px] md:h-[900px]"
          >
            <motion.div 
              className="absolute inset-0"
              animate={{
                rotate: 360,
                scale: [1, 1.2, 0.9, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 55, ease: "linear", repeat: Infinity },
                scale: { duration: 28, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              }}
            >
              <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[110px] md:blur-[150px] opacity-40 mix-blend-screen" />
            </motion.div>
          </motion.div>
        </div>

        <div className="relative z-10 text-center">
          <Loader2 className="w-12 h-12 text-eco-accent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-mono">Loading file information...</p>
        </div>
      </main>
    );
  }

  if (error && files.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center pt-32 pb-32 px-4 md:px-6 relative overflow-hidden bg-[#050505]">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] md:w-[900px] md:h-[900px]"
          >
            <motion.div 
              className="absolute inset-0"
              animate={{
                rotate: 360,
                scale: [1, 1.2, 0.9, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 55, ease: "linear", repeat: Infinity },
                scale: { duration: 28, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              }}
            >
              <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[110px] md:blur-[150px] opacity-40 mix-blend-screen" />
            </motion.div>
          </motion.div>
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 md:p-10 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h1 className="text-2xl font-bold text-white">Error</h1>
            </div>
            <p className="text-gray-300 font-mono">{error}</p>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center pt-32 pb-32 px-4 md:px-6 relative overflow-hidden bg-[#050505]">
      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] md:w-[900px] md:h-[900px]"
        >
          <motion.div 
            className="absolute inset-0"
            animate={{
              rotate: 360,
              scale: [1, 1.2, 0.9, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 55, ease: "linear", repeat: Infinity },
              scale: { duration: 28, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }}
          >
            <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#2A70F1_120deg,transparent_240deg)] blur-[110px] md:blur-[150px] opacity-40 mix-blend-screen" />
          </motion.div>
        </motion.div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl md:text-6xl font-sans text-white mb-4 tracking-tight">
            {files.length === 1 ? "Download File" : "Download Files"}
          </h1>
          <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">
            Public File Download
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </motion.div>
        )}

        {/* Files List */}
        <div className="space-y-4">
          {files.map((file, index) => {
            const expired = isExpired(file.expiresAt);
            const downloading = downloadingIds.has(file.blobId);
            const progress = downloadProgress[file.blobId] || 0;

            return (
              <motion.div
                key={file.blobId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
                
                {/* File Info */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-eco-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-eco-accent" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-2 truncate">
                      {file.fileName}
                    </h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 font-mono">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatFileSize(file.fileSize)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className={expired ? "text-red-400" : ""}>
                          {getExpirationText(file.expiresAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        <span className="text-eco-accent">Public</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blob ID */}
                <div className="mb-6 p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono mb-1">
                      Blob ID
                    </p>
                    <button
                      onClick={() => copyBlobId(file.blobId)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-eco-accent/20 text-eco-accent rounded hover:bg-eco-accent/30 transition-all font-mono"
                    >
                      {copiedId === file.blobId ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-gray-500 break-all select-all">
                    {file.blobId}
                  </p>
                </div>

                {/* Download Progress */}
                {downloading && progress > 0 && progress < 100 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-2">
                      <span>Downloading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-eco-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloading || expired}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    expired
                      ? "bg-gray-800/50 text-gray-500 cursor-not-allowed"
                      : downloading
                      ? "bg-eco-accent/50 cursor-wait"
                      : "bg-eco-accent hover:bg-eco-accent/90 shadow-lg shadow-eco-accent/20"
                  }`}
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : expired ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>File Expired</span>
                    </>
                  ) : progress === 100 ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Download Complete</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download File</span>
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center text-sm text-gray-500 font-mono"
        >
          <p>Files are stored on the decentralized Walrus network</p>
        </motion.div>
      </div>

      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />
    </main>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 text-eco-accent animate-spin" />
      </main>
    }>
      <DownloadContent />
    </Suspense>
  );
}

