/** multer `memoryStorage` 下单文件形状（不依赖 `@types/multer`）。 */
export type MemoryUploadedImageFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};
