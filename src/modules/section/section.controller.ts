import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SectionService } from './section.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/provider/jwt/jwt.guard';
import { ListSectionDataDto, ListSectionDto } from './dto/list.dto';
import { JwtPayload } from '@/common/decorators/jwt-payload.decorator';
import { IJwtPayload } from '@/types/auth.types';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { CreateSectionDto } from './dto/create.dto';
import { DeleteSectionDto } from './dto/delete.dto';
import { UpdateSectionContentDto } from './dto/update-content.dto';
import { UpdateSectionDto } from './dto/update.dto';
import { ReorderSectionDataDto, ReorderSectionDto } from './dto/reorder.dto';
import { SectionDto } from '@/common/dto/business/section.dto';

@ApiTags('模块管理')
@Controller('section')
@UseGuards(JwtGuard)
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post('list')
  @ApiOperation({ summary: '模块列表（按简历）' })
  @ApiBody({ type: ListSectionDto })
  @ApiResponseWrapper(ListSectionDataDto)
  list(@Body() body: ListSectionDto, @JwtPayload() jwt: IJwtPayload) {
    return this.sectionService.list(body, jwt);
  }

  @Post('create')
  @ApiOperation({ summary: '新增模块' })
  @ApiBody({ type: CreateSectionDto })
  @ApiResponseWrapper(SectionDto)
  create(@Body() body: CreateSectionDto, @JwtPayload() jwt: IJwtPayload) {
    return this.sectionService.create(body, jwt);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除模块' })
  @ApiBody({ type: DeleteSectionDto })
  @ApiResponseWrapper(SectionDto)
  delete(@Body() body: DeleteSectionDto, @JwtPayload() jwt: IJwtPayload) {
    return this.sectionService.delete(body, jwt);
  }

  @Post('update')
  @ApiOperation({ summary: '更新模块（仅 order）' })
  @ApiBody({ type: UpdateSectionDto })
  @ApiResponseWrapper(SectionDto)
  update(@Body() body: UpdateSectionDto, @JwtPayload() jwt: IJwtPayload) {
    return this.sectionService.update(body, jwt);
  }

  @Post('reorder')
  @ApiOperation({ summary: '批量调整模块顺序（按简历）' })
  @ApiBody({ type: ReorderSectionDto })
  @ApiResponseWrapper(ReorderSectionDataDto)
  reorder(@Body() body: ReorderSectionDto, @JwtPayload() jwt: IJwtPayload) {
    return this.sectionService.reorder(body, jwt);
  }

  @Post('update-content')
  @ApiOperation({ summary: '更新模块内容（替换全部 Content / Info）' })
  @ApiBody({ type: UpdateSectionContentDto })
  @ApiResponseWrapper(SectionDto)
  updateContent(
    @Body() body: UpdateSectionContentDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.sectionService.updateContent(body, jwt);
  }
}
