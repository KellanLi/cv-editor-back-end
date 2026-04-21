import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ContentTemplateService } from './content-template.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/provider/jwt/jwt.guard';
import {
  ListContentTemplateDataDto,
  ListContentTemplateDto,
} from './dto/list.dto';
import { JwtPayload } from '@/common/decorators/jwt-payload.decorator';
import { IJwtPayload } from '@/types/auth.types';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { CreateContentTemplateDto } from './dto/create.dto';
import { ContentTemplateDto } from '../../common/dto/business/content-template.dto';
import { UpdateContentTemplateDto } from './dto/update.dto';
import { DeleteContentTemplateDto } from './dto/delete.dto';

@ApiTags('模块管理模块')
@Controller('content-template')
@UseGuards(JwtGuard)
export class ContentTemplateController {
  constructor(
    private readonly contentTemplateService: ContentTemplateService,
  ) {}

  @Post('list')
  @ApiOperation({ summary: '模块列表' })
  @ApiBody({ type: ListContentTemplateDto })
  @ApiResponseWrapper(ListContentTemplateDataDto)
  list(@Body() body: ListContentTemplateDto, @JwtPayload() jwt: IJwtPayload) {
    return this.contentTemplateService.list(body, jwt);
  }

  @Post('create')
  @ApiOperation({ summary: '创建模块' })
  @ApiBody({ type: CreateContentTemplateDto })
  @ApiResponseWrapper(ContentTemplateDto)
  create(
    @Body() body: CreateContentTemplateDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.contentTemplateService.create(body, jwt);
  }

  @Post('update')
  @ApiOperation({ summary: '更新模块' })
  @ApiBody({ type: UpdateContentTemplateDto })
  @ApiResponseWrapper(ContentTemplateDto)
  update(
    @Body() body: UpdateContentTemplateDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.contentTemplateService.update(body, jwt);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除模块' })
  @ApiBody({ type: DeleteContentTemplateDto })
  @ApiResponseWrapper(ContentTemplateDto)
  delete(
    @Body() body: DeleteContentTemplateDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.contentTemplateService.delete(body, jwt);
  }
}
