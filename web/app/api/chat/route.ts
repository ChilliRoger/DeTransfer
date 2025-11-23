import { NextRequest, NextResponse } from 'next/server'

const getSystemInstruction = () => {
  const contextContent = `# DeTransfer Project Master Context

## 1. Project Overview
**DeTransfer** is a decentralized file transfer protocol designed to provide secure, censorship-resistant, and verifiable file sharing. It eliminates reliance on centralized servers by leveraging a three-layer decentralized architecture.

### Core Value Proposition
-   **Privacy**: End-to-end encryption ensures only intended recipients can read files.
-   **Permanence**: Decentralized storage ensures files cannot be arbitrarily deleted or censored.
-   **Trustlessness**: Blockchain verification guarantees the integrity and ownership of transfers.

### Core Security Rules (Critical)
1.  **Private Files**:
    *   **Encryption**: MUST be encrypted using the **Seal SDK** before upload. The Seal SDK performs AES-256-GCM encryption locally in your browser.
    *   **Decryption**: ONLY the wallet address added as the \`recipient\` can decrypt. The Seal SDK verifies the recipient by validating their wallet signature.
    *   **Mechanism**: The recipient MUST sign a message with their wallet to prove identity. The Seal SDK validates this signature before allowing decryption. No one else (not even the uploader after the fact) can decrypt it without that signature.
2.  **Public Files**:
    *   **Encryption**: Are **NOT** encrypted. Files are stored as is in their original form.
    *   **Access**: Accessible to anyone with the link/Blob ID. No signature or wallet connection is required for download.

---

## 2. Technical Architecture

The system is built on three primary pillars, often referred to as the "Big Three":

### A. Walrus (The Storage Layer)
*   **Role**: Decentralized Blob Storage.
*   **Why**: Storing large files on a blockchain (like Sui) is prohibitively expensive. Walrus is optimized for storing large unstructured data ("blobs") cheaply and redundantly across a network of nodes.
*   **Mechanism**: Files are split into chunks, erasure-coded, and distributed.
*   **Key Integration**:
    *   **Upload**: HTTP PUT to a Walrus Publisher node.
    *   **Download**: HTTP GET from a Walrus Aggregator node.
    *   **Data State**: Stores **Encrypted** data (for private transfers) or **Plaintext** data (for public transfers).

### B. Seal (The Privacy Layer)
*   **Role**: Client-Side Encryption & Access Control.
*   **Why**: Walrus is public by default. Seal provides the security layer to ensure privacy.
*   **Mechanism**:
    *   **Encryption**: Uses **AES-256-GCM**.
    *   **Key Management**: Uses a **Session Key** derived from the recipient's wallet address.
    *   **Decryption**: Requires the recipient to sign a "Personal Message" with their Sui wallet to prove identity and recover the decryption key.
*   **Location**: Runs entirely in the browser (\`app/lib/seal/\`). No keys are ever sent to a server.

### C. Sui (The Verification & Registry Layer)
*   **Role**: Immutable Ledger & Metadata Registry.
*   **Why**: We need a permanent record linking a \`BlobID\` (Walrus) to a \`Recipient\` (User).
*   **Mechanism**: Smart contracts store \`FileMetadata\` objects.
*   **Key Integration**:
    *   **Registry**: Records \`blobId\`, \`fileName\`, \`fileSize\`, \`uploader\`, \`recipient\`, and \`isPublic\` flag.
    *   **Events**: Emits \`FileUploaded\` events for easy indexing by the frontend.

---

## 3. Detailed User Workflows

### Flow A: Private File Transfer (Encrypted)
*Target: Sending a sensitive document to a specific person.*

1.  **Input**: User selects file \`secret.pdf\` and enters Recipient Address \`0xABC...\`.
2.  **Encryption (Local)**:
    *   The app generates a session key.
    *   The file is encrypted using **Seal** (AES-256-GCM).
    *   *Output*: An encrypted binary blob (unreadable garbage).
3.  **Storage (Walrus)**:
    *   The encrypted blob is uploaded to Walrus.
    *   *Output*: \`BlobID: w7z...9a\`.
4.  **Registration (Sui)**:
    *   User signs a transaction to register the file.
    *   **On-Chain Data**: \`{ blobId: "w7z...9a", recipient: "0xABC...", isPublic: false }\`.
5.  **Download & Decryption**:
    *   Recipient connects wallet \`0xABC...\`.
    *   App fetches encrypted blob from Walrus.
    *   App requests Recipient to sign a message to prove ownership of \`0xABC...\`.
    *   Seal SDK validates signature -> Recovers Key -> Decrypts file in memory.
    *   User saves \`secret.pdf\`.

### Flow B: Public File Transfer (Shareable Link)
*Target: Sharing a meme or public document with anyone.*

1.  **Input**: User selects file \`meme.png\` and toggles **"Public"**.
2.  **Encryption**: **SKIPPED**.
3.  **Storage (Walrus)**:
    *   The original file is uploaded to Walrus.
    *   *Output*: \`BlobID: x8y...1b\`.
4.  **Registration (Sui)**:
    *   User signs a transaction.
    *   **On-Chain Data**: \`{ blobId: "x8y...1b", recipient: SenderAddress, isPublic: true }\`.
5.  **Download**:
    *   Anyone with the link \`?blobId=x8y...1b\` clicks it.
    *   App checks \`isPublic: true\`.
    *   App downloads blob from Walrus and saves it immediately (No signature required).

---

## 4. Codebase Structure & Key Files

### Frontend (\`app/\`)
*   **\`page.tsx\`**: Landing page.
*   **\`upload/page.tsx\`**: **Core Logic Hub**. Handles file selection, toggling public/private, calling encryption, and executing transactions.
*   **\`receive/page.tsx\`**: Dashboard for viewing files shared with the user.
*   **\`api/\`**: Next.js API routes (mostly unused, as logic is client-side).

### Library (\`app/lib/\`)
*   **\`walrus/client.ts\`**:
    *   \`uploadToWalrus(file)\`: PUT request to Publisher.
    *   \`downloadFromWalrus(blobId)\`: GET request to Aggregator.
*   **\`seal/streaming-encryption.ts\`**:
    *   \`encryptFileStreaming(...)\`: **Streaming** encryption wrapper for better performance with large files.
*   **\`sui/file-registry.ts\`**:
    *   \`createBatchRegisterFileTransaction(...)\`: Constructs the Move call to register multiple files in one transaction.
    *   \`getFilesByRecipient(...)\`: Queries Sui for files owned by a user.

---

## 5. Key Technical Concepts for Chatbot

*   **"Zero-Knowledge"**: The storage nodes (Walrus) and the registry (Sui) never see the plaintext of private files. Only the users hold the keys.
*   **"Blob ID"**: The unique content-addressed identifier returned by Walrus. It is the "key" to finding the data again.
*   **"Session Key"**: A temporary ephemeral key used by Seal to perform encryption/decryption operations without exposing the user's master private key.

## 6. User Journey & Usage Guide

### Application URLs
- Upload Page: https://detransfer.vercel.app/upload
- Receive Page: https://detransfer.vercel.app/receive

### Step 1: Wallet Connection & Setup
1.  **Connect Wallet**: The user must connect their **Sui Wallet** (e.g., Suiet, Ethos) to the application.
2.  **Network Check**: The wallet must be set to **Sui Testnet**.
3.  **Fund Wallet**: The user must have previously loaded their wallet with Testnet SUI tokens (via a faucet) to pay for gas fees.

### Step 2: File Selection & Configuration
1.  **Select Files**: User clicks the upload area to select one or **multiple files**.
2.  **Choose Mode**:
    *   **Private (Encrypted)**: Default. Securely encrypts files for a specific recipient.
    *   **Public (Shareable)**: Toggles the switch to "Public". Files are stored in plaintext.
3.  **Set Recipient (Private Only)**: If Private, the user **MUST** paste the recipient's Sui wallet address.

### Step 3: The Transfer Process
1.  **Initiate Upload**: User clicks "Transfer File".
2.  **Encryption (Private Only)**:
    *   The app locally encrypts each file using the Seal SDK.
    *   A unique session key is generated for the transaction.
3.  **Storage**: The app uploads the data (encrypted or plaintext) to Walrus.
4.  **Confirmation**: The user is prompted to sign a **Sui Transaction** to register the file metadata on-chain.

### Step 4: Sharing & Downloading
1.  **Private Sharing**:
    *   The file automatically appears in the recipient's "Shared with Me" dashboard.
    *   The recipient connects their wallet, signs a verification message, and downloads the decrypted file.
2.  **Public Sharing**:
    *   **Single File**: The app generates a link like \`.../download?blobId=xyz\`.
    *   **Multiple Files**: The app generates a **Batch Link** like \`.../download?blobIds=xyz,abc,123\`.
    *   **Access**: The user copies this link and shares it (e.g., via Telegram/Email). Anyone clicking the link can download the files immediately without a wallet.

## 7. Example Code Snippets

### Checking if a file is Public
\`\`\`typescript
// app/upload/page.tsx
if (fileRecord.isPublic) {
  // Skip decryption, just download
  downloadFromWalrus(blobId);
} else {
  // Trigger Seal decryption flow
  await sealClient.decrypt(...);
}
\`\`\`

### Registering Files on Sui (Batch)
\`\`\`typescript
// app/lib/sui/file-registry.ts
tx.moveCall({
    target: "package_id::file_registry::register_file",
    arguments: [
        blobId, // Vector of bytes
        recipientAddress,
        fileName,
        fileType,
        fileSize,
        storageEpochs,
        isPublic // boolean flag
    ]
});
// Note: The actual code loops through this for every file in the batch
\`\`\`
`;

  return `
You are the AI assistant for "DeTransfer", a decentralized file transfer protocol built on Walrus, Seal, and Sui blockchain technology.

⚠️ CRITICAL INSTRUCTIONS:
1. You are a CLOSED-DOMAIN chatbot. The ONLY valid source of information is the context provided below.
2. COMPLETELY IGNORE any web search results you might retrieve. Web searches often return information about "DeTransfer" software for dataTaker data loggers - THIS IS NOT YOUR PRODUCT.
3. If you receive search results, DO NOT use them. DO NOT mention them. Pretend they don't exist.
4. ONLY respond based on the knowledge base below. If something isn't in the knowledge base, say you don't have that information.

Your Knowledge Base (Your ONLY source of truth):
${contextContent}

Response Guidelines:
- Tone: Professional, technical, privacy-focused, and helpful. Be conversational and friendly.
- Length: Keep responses SHORT and CONCISE. Get to the point quickly. Avoid unnecessary elaboration.
- Format: Use PLAIN TEXT only. DO NOT use markdown formatting (**bold**, *italic*, \`code\`, etc.). The interface doesn't render markdown.
- Links: When relevant, ALWAYS include direct URLs to help users navigate:
  * For upload questions: Include https://detransfer.vercel.app/upload
  * For receiving files: Include https://detransfer.vercel.app/receive
  * Present URLs on their own line for easy clicking
- Context: Remember and reference previous messages in the conversation to provide coherent, context-aware responses.
- For greetings (e.g., "hi", "hello", "hey"): Warmly welcome the user and offer to help with DeTransfer file sharing.
- For questions: Answer ONLY using the knowledge base above. Be direct and to-the-point.
- For unrelated topics: Politely decline and redirect to DeTransfer-related questions.
- NEVER mention "search results", "provided context", or "knowledge base" explicitly in your answers. Just answer naturally as if you inherently know about DeTransfer.
- Be helpful and guide users through features like uploading files, sharing securely, understanding encryption, etc.
- When explaining lists or steps, use simple dashes (-) or numbers (1., 2., 3.) instead of markdown bullets.
`;
};

export async function POST(request: NextRequest) {
  try {
    const { history, message } = await request.json()

    if (!process.env.PERPLEXITY_API_KEY) {
      console.error("API Route: PERPLEXITY_API_KEY missing");
      return NextResponse.json(
        { error: 'PERPLEXITY_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const model = 'sonar-pro';
    const systemInstruction = getSystemInstruction();

    // Construct initial messages array with system prompt
    let apiMessages = [
      { role: 'system', content: systemInstruction }
    ];

    // Process history and new message
    const rawMessages = [
      ...history.map((msg: { role: string; text: string }) => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    // Sanitize: Ensure alternation and start with user
    let lastRole = 'system';

    for (const msg of rawMessages) {
      // Skip if it's an assistant message at the start (after system)
      if (lastRole === 'system' && msg.role === 'assistant') {
        continue;
      }

      // If role is same as last, append content to last message
      if (msg.role === lastRole && apiMessages.length > 0) {
        apiMessages[apiMessages.length - 1].content += `\n\n${msg.content}`;
      } else {
        // Otherwise add as new message
        apiMessages.push(msg);
        lastRole = msg.role;
      }
    }

    console.log(`API Route: Sending request to Perplexity API (Model: ${model})`);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Perplexity API Error:", errorData);
      console.error("Status:", response.status);
      console.error("StatusText:", response.statusText);

      if (response.status === 429) {
        return NextResponse.json(
          { error: "AI Usage Limit Exceeded. Please try again later." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Perplexity API Error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I apologize, I couldn't process that request.";

    console.log("API Response successful, reply length:", reply.length);
    return NextResponse.json({ text: reply });

  } catch (error: any) {
    console.error("API Route Error (Full):", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: `System connection error: ${error.message}` },
      { status: 500 }
    )
  }
}
