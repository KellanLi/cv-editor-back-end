import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ContentTemplateService } from './content-template.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/provider/jwt/jwt.guard';
import { ListDataDto, ListDto } from './dto/list.dto';
import { JwtPayload } from '@/common/decorators/jwt-payload.decorator';
import { IJwtPayload } from '@/types/auth.types';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { CreateDto } from './dto/create.dto';
import { ContentTemplateDto } from './dto/content-template.dto';
import { UpdateDto } from './dto/update.dto';
import { DeleteDto } from './dto/delete.dto';

@ApiTags('模块管理模块')
@Controller('content-template')
@UseGuards(JwtGuard)
export class ContentTemplateController {
  constructor(
    private readonly contentTemplateService: ContentTemplateService,
  ) {}

  @Post('list')
  @ApiOperation({ summary: '模块列表' })
  @ApiBody({ type: ListDto })
  @ApiResponseWrapper(ListDataDto)
  list(@Body() body: ListDto, @JwtPayload() jwt: IJwtPayload) {
    return this.contentTemplateService.list(body, jwt);
  }

  @Post('create')
  @ApiOperation({ summary: '创建模块' })
  @ApiBody({ type: CreateDto })
  @ApiResponseWrapper(ContentTemplateDto)
  create(@Body() body: CreateDto, @JwtPayload() jwt: IJwtPayload) {
    return this.contentTemplateService.create(body, jwt);
  }

  @Post('update')
  @ApiOperation({ summary: '更新模块' })
  @ApiBody({ type: UpdateDto })
  @ApiResponseWrapper(ContentTemplateDto)
  update(@Body() body: UpdateDto, @JwtPayload() jwt: IJwtPayload) {
    return this.contentTemplateService.update(body, jwt);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除模块' })
  @ApiBody({ type: DeleteDto })
  @ApiResponseWrapper(ContentTemplateDto)
  delete(@Body() body: DeleteDto, @JwtPayload() jwt: IJwtPayload) {
    return this.contentTemplateService.delete(body, jwt);
  }
}
