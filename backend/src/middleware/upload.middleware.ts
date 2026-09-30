import type { Request, Response, NextFunction } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import multer from "multer";

const BUCKET = process.env["AWS_S3_BUCKET"] ?? "";
const REGION = process.env["AWS_REGION"] ?? "";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
    secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
  },
});

// Files are held in memory so they can be streamed straight to S3 -
// nothing ever touches the server's disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Parses a single multipart file field (e.g. "profile_picture").
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Uploads req.file to S3 and exposes the public URL on res.locals.fileUrl.
// No file on the request is not an error - handlers decide whether one was required.
export async function uploadToS3(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const file = req.file;
    if (!file) {
      next();
      return;
    }

    if (!BUCKET || !REGION) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: "S3 is not configured",
        message: "Missing AWS_S3_BUCKET or AWS_REGION",
      });
      return;
    }

    const extension = ALLOWED_MIME_TYPES[file.mimetype];
    const key = `${file.fieldname}/${randomUUID()}.${extension}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    res.locals["fileKey"] = key;
    res.locals["fileUrl"] =
      `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    next();
  } catch (err: any) {
    console.error("S3 upload failed:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: err.message,
      message: "Failed to upload file",
    });
  }
}

// Turns multer's own errors (size limit, bad mime type) into the API's response shape.
// Mount after the routes that use uploadSingle.
export function handleUploadError(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large - maximum size is 5MB"
        : err.message;

    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err.code, message });
    return;
  }

  if (err) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: err.message, message: "Invalid file upload" });
    return;
  }

  next();
}
