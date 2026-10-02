import { pool } from "../lib/db.ts";

export type DocumentKind = "pdf" | "log";

export interface DocumentRow {
  document_id: number;
  kind: DocumentKind;
  file_name: string;
  s3_key: string;
  // NULL for private files (logs).
  file_url: string | null;
  size_bytes: number;
  uploaded_by: number | null;
  uploaded_at: Date;
}

export interface DocumentListRow extends DocumentRow {
  uploaded_by_name: string | null;
}

export type NewDocument = Omit<DocumentRow, "document_id" | "uploaded_at">;

// Newest first, with the uploader's name for display.
export const getDocuments = async (
  kind: DocumentKind,
): Promise<DocumentListRow[]> => {
  const result = await pool.query(
    `
      SELECT d.*, (e.first_name || ' ' || e.last_name) AS uploaded_by_name
      FROM documents d
      LEFT JOIN employees e ON e.employee_id = d.uploaded_by
      WHERE d.kind = $1
      ORDER BY d.uploaded_at DESC, d.document_id DESC
    `,
    [kind],
  );
  return result.rows;
};

export const getDocumentById = async (
  kind: DocumentKind,
  document_id: number,
): Promise<DocumentRow | void> => {
  const result = await pool.query(
    `SELECT * FROM documents WHERE kind = $1 AND document_id = $2`,
    [kind, document_id],
  );
  return result.rows[0];
};

// CREATE
export const createDocument = async (
  document: NewDocument,
): Promise<DocumentRow | void> => {
  const query = `
      INSERT INTO documents (kind, file_name, s3_key, file_url, size_bytes, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
  const result = await pool.query(query, [
    document.kind,
    document.file_name,
    document.s3_key,
    document.file_url,
    document.size_bytes,
    document.uploaded_by,
  ]);
  return result.rows[0];
};

// DELETE: returns the removed row so the caller can delete its S3 object.
export const deleteDocument = async (
  kind: DocumentKind,
  document_id: number,
): Promise<DocumentRow | void> => {
  const result = await pool.query(
    `DELETE FROM documents WHERE kind = $1 AND document_id = $2 RETURNING *`,
    [kind, document_id],
  );
  return result.rows[0];
};
