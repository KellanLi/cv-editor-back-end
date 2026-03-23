import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SectionService } from './section.service';
import { ListDataDto, ListDto } from './dto/list.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseWrapper } from '@/common/utils/swagger-response';
import { CreateDto } from './dto/create.dto';
import { SectionDto } from './dto/section.dto';
import { UpdateDto } from './dto/update.dto';
import { DeleteDto } from './dto/delete.dto';
import { EmptyDto } from '@/common/dto/empty.dto';
import { JwtGuard } from '@/provider/jwt/jwt.guard';

@ApiTags('模块管理模块')
@Controller('section')
@UseGuards(JwtGuard)
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @ApiOperation({ summary: '模块列表' })
  @ApiBody({ type: ListDto })
  @Post('list')
  @ApiResponseWrapper(ListDataDto)
  list(@Body() body: ListDto) {
    return this.sectionService.list(body);
  }

  @ApiOperation({ summary: '创建模块' })
  @ApiBody({ type: CreateDto })
  @Post('create')
  @ApiResponseWrapper(SectionDto)
  create(@Body() body: CreateDto) {
    return this.sectionService.create(body);
  }

  @ApiOperation({ summary: '更新模块' })
  @ApiBody({ type: UpdateDto })
  @Post('update')
  @ApiResponseWrapper(SectionDto)
  update(@Body() body: UpdateDto) {
    return this.sectionService.update(body);
  }

  @ApiOperation({ summary: '删除模块' })
  @ApiBody({ type: DeleteDto })
  @Post('delete')
  @ApiResponseWrapper(EmptyDto)
  delete(@Body() body: DeleteDto) {
    return this.sectionService.delete(body);
  }
}
