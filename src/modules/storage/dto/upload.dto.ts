import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

/** 本地上传图片成功后 `data` 的形状（无 Prisma 实体；命名对齐 `ListContentTemplateDataDto` 的 `*DataDto` 后缀）。 */
export class UploadStorageDataDto {
  @ApiProperty({ description: '浏览器可直接使用的路径（含全局前缀）' })
  @IsString()
  url!: string;

  @ApiProperty({ description: '磁盘上的文件名（UUID + 扩展名）' })
  @IsString()
  storedName!: string;

  @ApiProperty({ description: '原始文件名' })
  @IsString()
  originalName!: string;

  @ApiProperty({ description: 'MIME 类型' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: '字节大小' })
  @IsInt()
  @Min(0)
  size!: number;
}
