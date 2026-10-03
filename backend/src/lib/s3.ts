import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const BUCKET = process.env["AWS_S3_BUCKET"] ?? "";
const REGION = process.env["AWS_REGION"] ?? "";

// The bucket is shared with other projects, so everything this app stores
// lives under one folder. No space or apostrophe: those would have to be
// URL-encoded in every public link.
const ROOT_FOLDER = "bulls-coffee";

const MB = 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Browsers label .csv files inconsistently (Windows with Excel installed says
// application/vnd.ms-excel), so these are only accepted with a .csv name.
const CSV_TYPES: Record<string, string> = {
  "text/csv": "csv",
  "application/csv": "csv",
  "application/vnd.ms-excel": "csv",
  "text/plain": "csv",
};

const PDF_TYPES: Record<string, string> = { "application/pdf": "pdf" };

interface MediaRule {
  folder: string;
  // Accepted mime type -> extension the file is stored under.
  types: Record<string, string>;
  maxBytes: number;
  // For error messages: "Only <description> are allowed".
  description: string;
  // The bucket is publicly readable, so private files are encrypted with
  // KMS: S3 refuses those to anonymous requests and only the API (which
  // signs its requests) can read them back.
  isPrivate: boolean;
  // Documents keep a readable form of their original name in the key;
  // images just get a UUID.
  keepName: boolean;
}

const image = (folder: string): MediaRule => ({
  folder,
  types: IMAGE_TYPES,
  maxBytes: 5 * MB,
  description: "JPEG, PNG, WebP and GIF images",
  isPrivate: false,
  keepName: false,
});

// Bucket layout, all under bulls-coffee/:
//   products/  categories/  ingredients/  suppliers/  employees/  (images)
//   pdfs/  (public)   logs/  (private CSVs - manager/admin via the API)
//   backups/  exports/  health/  (private, written by the API itself; see
//   storePrivateObject)
export const MEDIA = {
  product: image("products"),
  category: image("categories"),
  ingredient: image("ingredients"),
  supplier: image("suppliers"),
  employee: image("employees"),
  pdf: {
    folder: "pdfs",
    types: PDF_TYPES,
    maxBytes: 10 * MB,
    description: "PDF files",
    isPrivate: false,
    keepName: true,
  },
  log: {
    folder: "logs",
    types: CSV_TYPES,
    maxBytes: 10 * MB,
    description: "CSV files",
    isPrivate: true,
    keepName: true,
  },
} satisfies Record<string, MediaRule>;

export type MediaKind = keyof typeof MEDIA;

interface IncomingFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface StoredFile {
  key: string;
  // Public files only; private ones are read back with readFile.
  url: string | null;
}

// Built on first use, not at import: S3Client throws without a region, and
// the server should still boot without AWS settings (uploads report that
// per request instead).
let s3: S3Client | undefined;
const getS3 = (): S3Client =>
  (s3 ??= new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
    },
  }));

export const isS3Configured = (): boolean => Boolean(BUCKET && REGION);

// The extension `file` would be stored under, or undefined if `kind` doesn't
// accept it.
export function extensionFor(
  kind: MediaKind,
  file: Pick<IncomingFile, "originalname" | "mimetype">,
): string | undefined {
  const extension = MEDIA[kind].types[file.mimetype];
  if (
    extension === "csv" &&
    !file.originalname.toLowerCase().endsWith(".csv")
  ) {
    return undefined;
  }
  return extension;
}

// "Supplier Invoice #12.pdf" -> "supplier-invoice-12"
const slugify = (fileName: string): string =>
  fileName
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "") || "file";

export async function storeFile(
  kind: MediaKind,
  file: IncomingFile,
): Promise<StoredFile> {
  const rule = MEDIA[kind];
  const extension = extensionFor(kind, file);
  if (!extension) throw new Error(`Only ${rule.description} are allowed`);

  const id = randomUUID();
  const fileName = rule.keepName
    ? `${slugify(file.originalname)}-${id.slice(0, 8)}.${extension}`
    : `${id}.${extension}`;
  const key = `${ROOT_FOLDER}/${rule.folder}/${fileName}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: extension === "csv" ? "text/csv" : file.mimetype,
      ...(rule.keepName
        ? {
            ContentDisposition: `${rule.isPrivate ? "attachment" : "inline"}; filename="${fileName}"`,
          }
        : {}),
      // Keys are never reused, so public files can be cached forever.
      ...(rule.isPrivate
        ? { ServerSideEncryption: "aws:kms" as const }
        : { CacheControl: "public, max-age=31536000, immutable" }),
    }),
  );

  return {
    key,
    url: rule.isPrivate
      ? null
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
  };
}

// Files the API writes itself (backups, exports) rather than receives as an
// upload. Always private, like logs/: KMS-encrypted, so S3 refuses them to
// anonymous requests and only the API can read them back. Returns the key.
export async function storePrivateObject(
  folder: "backups" | "exports" | "health",
  fileName: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<string> {
  const key = `${ROOT_FOLDER}/${folder}/${fileName}`;
  await getS3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${fileName}"`,
      ServerSideEncryption: "aws:kms",
    }),
  );
  return key;
}

export async function readFile(key: string): Promise<Uint8Array> {
  const result = await getS3().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  if (!result.Body) throw new Error(`S3 object ${key} has no body`);
  return result.Body.transformToByteArray();
}

// Whether `key` exists, without downloading it: the System Health storage
// probe. (HeadBucket would need list permission, which the app's user lacks.)
export async function headFile(key: string): Promise<void> {
  await getS3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteFile(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
