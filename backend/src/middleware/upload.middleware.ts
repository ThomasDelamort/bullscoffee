import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import multer from "multer";
import {
  MEDIA,
  extensionFor,
  isS3Configured,
  storeFile,
  type MediaKind,
  type StoredFile,
} from "../lib/s3.ts";

// Parses a single multipart file field and stores the file in its kind's S3
// folder (see MEDIA in lib/s3.ts). Exposes res.locals.fileKey, plus
// res.locals.fileUrl for public files.
// No file on the request is not an error - handlers decide whether one was
// required. JSON requests pass straight through.
export function uploadFile(kind: MediaKind, fieldName = "image") {
  const rule = MEDIA[kind];

  // Files are held in memory so they can be streamed straight to S3 -
  // nothing ever touches the server's disk.
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: rule.maxBytes, files: 1 },
    // Browsers send UTF-8 filenames; multer would otherwise read them as latin1.
    defParamCharset: "utf8",
    fileFilter: (_req, file, cb) => {
      if (!extensionFor(kind, file)) {
        cb(new Error(`Only ${rule.description} are allowed`));
        return;
      }
      cb(null, true);
    },
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    parse(req, res, async (err?: unknown) => {
      if (err) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: uploadErrorMessage(err, rule.maxBytes) });
        return;
      }

      const file = req.file;
      if (!file) {
        next();
        return;
      }

      if (!isS3Configured()) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: "S3 is not configured",
          message: "Missing AWS_S3_BUCKET or AWS_REGION",
        });
        return;
      }

      let stored: StoredFile;
      try {
        stored = await storeFile(kind, file);
      } catch (error: any) {
        console.error("S3 upload failed:", error);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Failed to upload file" });
        return;
      }

      res.locals["fileKey"] = stored.key;
      if (stored.url) res.locals["fileUrl"] = stored.url;
      next();
    });
  };
}

// Multer's size limit / unexpected field errors, and the fileFilter rejection.
function uploadErrorMessage(err: unknown, maxBytes: number): string {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return `File is too large - maximum size is ${maxBytes / (1024 * 1024)}MB`;
    }
    return err.field ? `${err.message}: ${err.field}` : err.message;
  }
  return err instanceof Error ? err.message : "Invalid file upload";
}
