import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export interface UploadedFile {
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

export async function uploadFile(
  file: File,
  uploadDir: string = 'receipts'
): Promise<UploadedFile> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Create upload directory if it doesn't exist
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads', uploadDir)
  if (!existsSync(uploadsPath)) {
    await mkdir(uploadsPath, { recursive: true })
  }

  // Generate unique filename
  const timestamp = Date.now()
  const randomSuffix = Math.floor(Math.random() * 1000)
  const fileExtension = path.extname(file.name)
  const fileName = `${timestamp}_${randomSuffix}${fileExtension}`
  const filePath = path.join(uploadsPath, fileName)

  // Write file
  await writeFile(filePath, buffer)

  return {
    fileName,
    fileUrl: `/uploads/${uploadDir}/${fileName}`,
    fileSize: file.size,
    mimeType: file.type
  }
}

export async function parseFormData(request: NextRequest): Promise<{
  formData: Record<string, any>
  files: Record<string, File>
}> {
  const data = await request.formData()
  const formData: Record<string, any> = {}
  const files: Record<string, File> = {}

  for (const [key, value] of data.entries()) {
    if (value instanceof File) {
      files[key] = value
    } else {
      formData[key] = value
    }
  }

  return { formData, files }
}

export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function isValidFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

export const RECEIPT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf'
]

export const MAX_RECEIPT_SIZE_MB = 5