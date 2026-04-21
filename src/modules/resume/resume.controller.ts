import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/provider/jwt/jwt.guard';
import { ListResumeDataDto, ListResumeDto } from './dto/list.dto';
import { JwtPayload } from '@/common/decorators/jwt-payload.decorator';
import { IJwtPayload } from '@/types/auth.types';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { CreateResumeDto } from './dto/create.dto';
import { ResumeDto } from '@/common/dto/business/resume.dto';
import { DeleteResumeDto } from './dto/delete.dto';

@ApiTags('简历模块')
@Controller('resume')
@UseGuards(JwtGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('list')
  @ApiOperation({ summary: '简历列表' })
  @ApiBody({ type: ListResumeDto })
  @ApiResponseWrapper(ListResumeDataDto)
  list(@Body() body: ListResumeDto, @JwtPayload() jwt: IJwtPayload) {
    return this.resumeService.list(body, jwt);
  }

  @Post('create')
  @ApiOperation({ summary: '创建简历' })
  @ApiBody({ type: CreateResumeDto })
  @ApiResponseWrapper(ResumeDto)
  create(@Body() body: CreateResumeDto, @JwtPayload() jwt: IJwtPayload) {
    return this.resumeService.create(body, jwt);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除简历' })
  @ApiBody({ type: DeleteResumeDto })
  @ApiResponseWrapper(ResumeDto)
  delete(@Body() body: DeleteResumeDto, @JwtPayload() jwt: IJwtPayload) {
    return this.resumeService.delete(body, jwt);
  }
}
