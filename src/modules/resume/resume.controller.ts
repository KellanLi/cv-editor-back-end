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
import { DetailResumeDto } from './dto/detail.dto';
import { UpdateResumeTitleDto } from './dto/update-title.dto';
import { UpdateResumeListCoverDto } from './dto/update-list-cover.dto';
import { UpdateResumeProfileDto } from './dto/update-profile.dto';

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

  @Post('detail')
  @ApiOperation({ summary: '简历详情（含 ResumeProfile）' })
  @ApiBody({ type: DetailResumeDto })
  @ApiResponseWrapper(ResumeDto)
  detail(@Body() body: DetailResumeDto, @JwtPayload() jwt: IJwtPayload) {
    return this.resumeService.detail(body, jwt);
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

  @Post('update-title')
  @ApiOperation({ summary: '修改简历名称' })
  @ApiBody({ type: UpdateResumeTitleDto })
  @ApiResponseWrapper(ResumeDto)
  updateTitle(
    @Body() body: UpdateResumeTitleDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.resumeService.updateTitle(body, jwt);
  }

  @Post('update-list-cover')
  @ApiOperation({ summary: '修改列表展示用封面图' })
  @ApiBody({ type: UpdateResumeListCoverDto })
  @ApiResponseWrapper(ResumeDto)
  updateListCover(
    @Body() body: UpdateResumeListCoverDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.resumeService.updateListCover(body, jwt);
  }

  @Post('update-profile')
  @ApiOperation({ summary: '修改简历个人信息（ResumeProfile）' })
  @ApiBody({ type: UpdateResumeProfileDto })
  @ApiResponseWrapper(ResumeDto)
  updateProfile(
    @Body() body: UpdateResumeProfileDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.resumeService.updateProfile(body, jwt);
  }
}
