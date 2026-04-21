import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { UploadStorageDataDto } from './dto/upload.dto';
import type { MemoryUploadedImageFile } from '@/types/storage.types';

const STORED_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private rootResolved!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const root = this.config.get<string>('storage.root', 'uploads');
    this.rootResolved = path.resolve(process.cwd(), root);
    mkdirSync(this.rootResolved, { recursive: true });
  }

  /** 上传字段名，与 {@link FileInterceptor} 一致。 */
  static readonly uploadFieldName = 'file';

  buildPublicUrl(storedName: string): string {
    const prefix = this.config.get<string>('api.globalPrefix', 'api/v1');
    const p = prefix.replace(/^\/+|\/+$/g, '');
    return `/${p}/storage/file/${storedName}`;
  }

  saveImage(file: MemoryUploadedImageFile): UploadStorageDataDto {
    const ext = this.resolveExtension(file);
    const storedName = `${randomUUID()}${ext}`;
    const dest = path.join(this.rootResolved, storedName);
    writeFileSync(dest, file.buffer);
    return {
      url: this.buildPublicUrl(storedName),
      storedName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  openStoredImage(storedName: string): StreamableFile {
    const safe = path.basename(storedName);
    if (!STORED_NAME_RE.test(safe)) {
      throw new BadRequestException('非法文件名');
    }
    const absolute = path.join(this.rootResolved, safe);
    const rootWithSep = this.rootResolved.endsWith(path.sep)
      ? this.rootResolved
      : `${this.rootResolved}${path.sep}`;
    if (!absolute.startsWith(rootWithSep) && absolute !== this.rootResolved) {
      throw new BadRequestException('非法路径');
    }
    if (!existsSync(absolute)) {
      throw new NotFoundException('文件不存在');
    }
    const stream = createReadStream(absolute);
    return new StreamableFile(stream, {
      type: this.guessMimeFromName(safe),
    });
  }

  private resolveExtension(file: MemoryUploadedImageFile): string {
    const fromName = path.extname(file.originalname || '').toLowerCase();
    if (fromName && /^\.(jpe?g|png|gif|webp)$/.test(fromName)) {
      return fromName === '.jpeg' ? '.jpg' : fromName;
    }
    const fromMime = MIME_EXT[file.mimetype];
    if (fromMime) {
      return fromMime;
    }
    return '.bin';
  }

  private guessMimeFromName(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return map[ext] ?? 'application/octet-stream';
  }
}
