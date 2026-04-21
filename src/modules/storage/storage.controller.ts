import {
  Controller,
  FileTypeValidator,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@/provider/jwt/jwt.guard';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { JwtPayload } from '@/common/decorators/jwt-payload.decorator';
import { IJwtPayload } from '@/types/auth.types';
import { UploadStorageDataDto } from './dto/upload.dto';
import type { MemoryUploadedImageFile } from '@/types/storage.types';

const imageFilePipe = new ParseFilePipe({
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  validators: [
    new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 }),
    new FileTypeValidator({
      fileType: /^image\/(jpeg|png|gif|webp)$/i,
    }),
  ],
});

@ApiTags('图片存储')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor(StorageService.uploadFieldName))
  @ApiOperation({ summary: '上传图片（本地磁盘）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: '图片文件' },
      },
    },
  })
  @ApiResponseWrapper(UploadStorageDataDto)
  upload(
    @UploadedFile(imageFilePipe) file: MemoryUploadedImageFile,
    @JwtPayload() _jwt: IJwtPayload,
  ) {
    void _jwt;
    return this.storageService.saveImage(file);
  }

  @Get('file/:storedName')
  @ApiOperation({ summary: '读取已存储的图片（供 img 等直接引用）' })
  @ApiParam({ name: 'storedName', description: '上传接口返回的 storedName' })
  serve(@Param('storedName') storedName: string) {
    return this.storageService.openStoredImage(storedName);
  }
}
