import { createClient, Client } from '@libsql/client';

export interface FileRecord {
  id?: number;
  walletAddress: string;
  blobId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  recipientAddress: string;
  uploadedAt: string;
  isPublic: boolean;
}

class FileDatabase {
  private client: Client;

  constructor() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_DATABASE_TOKEN;

    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL and TURSO_DATABASE_TOKEN must be defined in environment variables');
    }

    this.client = createClient({
      url,
      authToken,
    });

    this.init();
  }

  private async init() {
    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          walletAddress TEXT NOT NULL,
          blobId TEXT NOT NULL UNIQUE,
          fileName TEXT NOT NULL,
          fileType TEXT NOT NULL,
          fileSize INTEGER NOT NULL,
          recipientAddress TEXT NOT NULL,
          uploadedAt TEXT NOT NULL,
          isPublic INTEGER DEFAULT 0
        )
      `);

      // Check if columns exist
      const result = await this.client.execute("PRAGMA table_info(files)");
      const columns = result.rows;

      const hasRecipientAddress = columns.some(col => col.name === 'recipientAddress');
      if (!hasRecipientAddress) {
        await this.client.execute(`ALTER TABLE files ADD COLUMN recipientAddress TEXT`);
        await this.client.execute(`UPDATE files SET recipientAddress = walletAddress WHERE recipientAddress IS NULL`);
      }

      const hasIsPublic = columns.some(col => col.name === 'isPublic');
      if (!hasIsPublic) {
        await this.client.execute(`ALTER TABLE files ADD COLUMN isPublic INTEGER DEFAULT 0`);
      }
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
  }

  async saveFile(record: Omit<FileRecord, 'id'>) {
    await this.client.execute({
      sql: `
        INSERT INTO files (walletAddress, blobId, fileName, fileType, fileSize, recipientAddress, uploadedAt, isPublic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        record.walletAddress,
        record.blobId,
        record.fileName,
        record.fileType,
        record.fileSize,
        record.recipientAddress,
        record.uploadedAt,
        record.isPublic ? 1 : 0
      ]
    });
  }

  async getFilesByWallet(walletAddress: string): Promise<FileRecord[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM files WHERE walletAddress = ? ORDER BY uploadedAt DESC',
      args: [walletAddress]
    });
    return result.rows.map(row => ({
      ...row,
      isPublic: Boolean(row.isPublic)
    })) as unknown as FileRecord[];
  }

  async getFilesByRecipient(recipientAddress: string): Promise<FileRecord[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM files WHERE recipientAddress = ? ORDER BY uploadedAt DESC',
      args: [recipientAddress]
    });
    return result.rows.map(row => ({
      ...row,
      isPublic: Boolean(row.isPublic)
    })) as unknown as FileRecord[];
  }

  async getFileByBlobId(blobId: string): Promise<FileRecord | undefined> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM files WHERE blobId = ?',
      args: [blobId]
    });
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      isPublic: Boolean(row.isPublic)
    } as unknown as FileRecord;
  }

  async deleteFile(blobId: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: 'DELETE FROM files WHERE blobId = ?',
      args: [blobId]
    });
    return result.rowsAffected > 0;
  }

  async deleteAllFilesByWallet(walletAddress: string): Promise<number> {
    const result = await this.client.execute({
      sql: 'DELETE FROM files WHERE walletAddress = ?',
      args: [walletAddress]
    });
    return result.rowsAffected;
  }
}

export const fileDb = new FileDatabase();