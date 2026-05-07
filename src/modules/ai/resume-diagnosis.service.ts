import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { executeResumeDiagnosis } from '@/provider/langgraph/resume-diagnosis';
import type { DiagnoseResumeDto } from './dto/diagnose-resume.dto';
import type { ResumeDiagnosisReport } from '@/provider/langgraph/resume-diagnosis';
import type { IJwtPayload } from '@/types/auth.types';

function isWebSearchEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }
  if (value === 1) return true;
  return false;
}

@Injectable()
export class ResumeDiagnosisService {
  private readonly logger = new Logger(ResumeDiagnosisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async diagnoseForUserId(
    body: DiagnoseResumeDto,
    userId: number,
  ): Promise<{ report: ResumeDiagnosisReport }> {
    return this.runDiagnosis(body, userId);
  }

  async diagnose(
    body: DiagnoseResumeDto,
    jwt: IJwtPayload,
  ): Promise<{ report: ResumeDiagnosisReport }> {
    return this.runDiagnosis(body, jwt.id);
  }

  private async runDiagnosis(
    body: DiagnoseResumeDto,
    userId: number,
  ): Promise<{ report: ResumeDiagnosisReport }> {
    this.logger.log(
      `diagnose 请求 resumeId=${String(body.resumeId)} userId=${String(userId)}`,
    );

    try {
      const apiKey = this.config.get<string>('ai.openaiApiKey')?.trim();
      if (!apiKey) {
        this.logger.warn('diagnose 拒绝：未配置 ai.openaiApiKey');
        throw new BadRequestException(
          '未配置大模型 API Key，无法运行简历诊断。请设置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。',
        );
      }

      const owned = await this.prisma.resume.findFirst({
        where: { id: body.resumeId, userId },
        select: { id: true },
      });
      if (!owned) {
        throw new NotFoundException('简历不存在');
      }

      const webOn = isWebSearchEnabled(body.enableWebSearch);
      const tavilyKey = this.config.get<string>('ai.tavilyApiKey')?.trim() ?? '';

      this.logger.log(
        `diagnose 执行中 resumeId=${String(body.resumeId)} web=${String(webOn)}`,
      );

      const report = await executeResumeDiagnosis({
        prisma: this.prisma,
        userId,
        resumeId: body.resumeId,
        targetRole: body.targetRole,
        enableWebSearch: webOn,
        tavilyApiKey: tavilyKey,
        llm: {
          apiKey,
          baseUrl:
            this.config.get<string>('ai.openaiBaseUrl') ??
            'https://dashscope.aliyuncs.com/compatible-mode/v1',
          model: this.config.get<string>('ai.openaiModel') ?? 'qwen3.5-plus',
        },
      });

      this.logger.log(
        `diagnose 成功 resumeId=${String(body.resumeId)} jdSource=${report.jdSource}`,
      );
      return { report };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      this.logger.error(
        `diagnose 未捕获异常 resumeId=${String(body.resumeId)} userId=${String(userId)}: ${msg}`,
        stack,
      );
      if (msg === 'resume_not_found') {
        throw new NotFoundException('简历不存在');
      }
      throw new BadRequestException(`简历诊断失败：${msg}`);
    }
  }
}
