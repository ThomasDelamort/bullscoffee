import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { deleteFile, readFile } from "../lib/s3.ts";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocuments,
} from "../providers/document.provider.ts";
import type { DocumentKind } from "../providers/document.provider.ts";

// [singular, plural], for messages.
const NOUNS: Record<DocumentKind, [string, string]> = {
  pdf: ["PDF", "PDFs"],
  log: ["log", "logs"],
};

// The routes for each kind share these handlers, so each is built per kind.

export const getDocumentsHandler =
  (kind: DocumentKind) =>
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const documents = await getDocuments(kind);
      res.status(StatusCodes.OK).json({
        message: `Successfully fetched ${NOUNS[kind][1]}`,
        data: documents,
      });
    } catch (error: any) {
      console.error("getDocumentsHandler failed:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: `Failed to fetch ${NOUNS[kind][1]}` });
    }
  };

// Runs after uploadFile(kind, "file"), which has already stored the file in
// S3; this records it so it can be listed.
export const createDocumentHandler =
  (kind: DocumentKind) =>
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    const key = res.locals["fileKey"];
    if (!file || typeof key !== "string") {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: `Attach the ${NOUNS[kind][0]} as a "file" field` });
      return;
    }

    try {
      const document = await createDocument({
        kind,
        file_name: file.originalname.slice(0, 255),
        s3_key: key,
        file_url: res.locals["fileUrl"] ?? null,
        size_bytes: file.size,
        uploaded_by: res.locals["employee"].employee_id,
      });
      res.status(StatusCodes.CREATED).json({
        message: `Successfully uploaded ${NOUNS[kind][0]}`,
        data: document,
      });
    } catch (error: any) {
      console.error("createDocumentHandler failed:", error);
      // Without its row nothing would ever list or delete the file.
      await deleteFile(key).catch((cleanupError) =>
        console.error("Failed to remove unrecorded upload:", cleanupError),
      );
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: `Failed to save ${NOUNS[kind][0]}` });
    }
  };

// Private files (logs) are never served by S3 directly, so the API reads
// them and sends them on.
export const downloadDocumentHandler =
  (kind: DocumentKind) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const document_id = Number(req.params["id"]);
      if (!Number.isInteger(document_id)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Invalid document ID" });
        return;
      }

      const document = await getDocumentById(kind, document_id);
      if (!document) {
        res.status(StatusCodes.NOT_FOUND).json({ error: "Document not found" });
        return;
      }

      const body = await readFile(document.s3_key);
      // res.attachment also sets the content type from the file's extension.
      res.attachment(document.file_name);
      res.status(StatusCodes.OK).send(Buffer.from(body));
    } catch (error: any) {
      console.error("downloadDocumentHandler failed:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: `Failed to download ${NOUNS[kind][0]}` });
    }
  };

export const deleteDocumentHandler =
  (kind: DocumentKind) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const document_id = Number(req.params["id"]);
      if (!Number.isInteger(document_id)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Invalid document ID" });
        return;
      }

      const document = await deleteDocument(kind, document_id);
      if (!document) {
        res.status(StatusCodes.NOT_FOUND).json({ error: "Document not found" });
        return;
      }

      // The row is gone either way; a leftover object is only unused space.
      await deleteFile(document.s3_key).catch((error) =>
        console.error("Failed to delete S3 object:", error),
      );
      res
        .status(StatusCodes.OK)
        .json({ message: `${NOUNS[kind][0]} deleted successfully` });
    } catch (error: any) {
      console.error("deleteDocumentHandler failed:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: `Failed to delete ${NOUNS[kind][0]}` });
    }
  };
