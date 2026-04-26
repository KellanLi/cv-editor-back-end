import { PrismaService } from '@/provider/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { LanggraphService } from '@/provider/langgraph/langgraph.service';
import { IJwtPayload } from '@/types/auth.types';
import { randomUUID } from 'node:crypto';
import {
  ListAiConversationDto,
  ListAiConversationDataDto,
} from './dto/list-conversation.dto';
import { CreateAiConversationDto } from './dto/create-conversation.dto';
import { DeleteAiConversationDto } from './dto/delete-conversation.dto';
import { GetAiConversationDto } from './dto/get-conversation.dto';
import { UpdateAiConversationDto } from './dto/update-conversation.dto';
import { ListAiMessageDto, ListAiMessageDataDto } from './dto/list-message.dto';
import { UpsertAiGlobalContextDto } from './dto/upsert-global-context.dto';
import {
  ListAiGlobalContextDto,
  ListAiGlobalContextDataDto,
} from './dto/list-global-context.dto';
import { DeleteAiGlobalContextDto } from './dto/delete-global-context.dto';
import { SendAiChatDto } from './dto/send-chat.dto';
import { SendAiChatDataDto } from './dto/send-chat-response.dto';
import { AiConversationPurpose, AiMessageRole } from '@/generated/enums';
import { Prisma } from '@/generated/client';
import type { Response } from 'express';
import { buildBasicQaSystemPrompt } from '@/provider/langgraph/prompts/basic-qa.system.prompt';

/**
 * 请求体未走全局 `ValidationPipe` 时，布尔与字符串可能混用；仅将明确的 true、字符串 "true" / "1" 等视为开启联网。
 */
function isWebSearchRequestEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return false;
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly langgraph: LanggraphService,
  ) {}

  private writeSse(res: Response, event: string, data: unknown) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * 未带 conversationId 的「新会话首条」时：用 LLM 起标题并写库；失败时用首条内容截断兜底（仍写库），供列表与 meta 展示。
   */
  private async resolveAndPersistNewConversationTitle(
    params: SendAiChatDto,
    newConversationId: number,
  ): Promise<string | null> {
    if (params.conversationId != null) {
      return null;
    }
    let title = await this.langgraph.generateConversationTitle(
      params.userMessage,
    );
    if (!title) {
      const t = params.userMessage.trim();
      if (t) {
        title = t.length > 40 ? `${t.slice(0, 40)}…` : t;
      }
    }
    if (title) {
      await this.prisma.aiConversation.update({
        where: { id: newConversationId },
        data: { title },
      });
    }
    return title;
  }

  private async assertResumeOwned(resumeId: number, jwt: IJwtPayload) {
    const r = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: jwt.id },
      select: { id: true },
    });
    if (!r) {
      throw new NotFoundException('简历不存在');
    }
  }

  private async assertConversationForUser(
    conversationId: number,
    jwt: IJwtPayload,
  ) {
    const c = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, resume: { userId: jwt.id } },
    });
    if (!c) {
      throw new NotFoundException('对话不存在');
    }
    return c;
  }

  async listConversations(
    params: ListAiConversationDto,
    jwt: IJwtPayload,
  ): Promise<ListAiConversationDataDto> {
    const { filter, pagination } = params;
    const { page, pageSize } = pagination;
    await this.assertResumeOwned(filter.resumeId, jwt);

    const where: Prisma.AiConversationWhereInput = {
      resumeId: filter.resumeId,
      resume: { userId: jwt.id },
      ...(filter.status !== undefined ? { status: filter.status } : {}),
      ...(filter.purpose !== undefined ? { purpose: filter.purpose } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        orderBy: [{ lastMsgAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiConversation.count({ where }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total },
    };
  }

  async createConversation(params: CreateAiConversationDto, jwt: IJwtPayload) {
    await this.assertResumeOwned(params.resumeId, jwt);
    const purpose = params.purpose ?? AiConversationPurpose.BASIC_QA;
    return this.prisma.aiConversation.create({
      data: {
        resumeId: params.resumeId,
        purpose,
        threadId: randomUUID(),
        title: params.title ?? null,
      },
    });
  }

  async getConversation(params: GetAiConversationDto, jwt: IJwtPayload) {
    const c = await this.prisma.aiConversation.findFirst({
      where: { id: params.id, resume: { userId: jwt.id } },
      include: {
        messages: {
          orderBy: { seq: 'asc' },
          include: { toolCalls: true },
        },
      },
    });
    if (!c) {
      throw new NotFoundException('对话不存在');
    }
    return c;
  }

  async updateConversation(params: UpdateAiConversationDto, jwt: IJwtPayload) {
    await this.assertConversationForUser(params.id, jwt);
    return this.prisma.aiConversation.update({
      where: { id: params.id },
      data: {
        ...(params.title !== undefined ? { title: params.title } : {}),
        ...(params.status !== undefined ? { status: params.status } : {}),
      },
    });
  }

  async deleteConversation(params: DeleteAiConversationDto, jwt: IJwtPayload) {
    await this.assertConversationForUser(params.id, jwt);
    return this.prisma.aiConversation.delete({
      where: { id: params.id },
    });
  }

  async listMessages(
    params: ListAiMessageDto,
    jwt: IJwtPayload,
  ): Promise<ListAiMessageDataDto> {
    const { filter, pagination } = params;
    const { page, pageSize } = pagination;
    await this.assertConversationForUser(filter.conversationId, jwt);

    const where = { conversationId: filter.conversationId };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.aiMessage.findMany({
        where,
        orderBy: { seq: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { toolCalls: true },
      }),
      this.prisma.aiMessage.count({ where }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total },
    };
  }

  async listGlobalContexts(
    params: ListAiGlobalContextDto,
    jwt: IJwtPayload,
  ): Promise<ListAiGlobalContextDataDto> {
    const { filter, pagination } = params;
    const { page, pageSize } = pagination;
    await this.assertResumeOwned(filter.resumeId, jwt);

    const where = { resumeId: filter.resumeId };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.aiGlobalContext.findMany({
        where,
        orderBy: { key: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiGlobalContext.count({ where }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total },
    };
  }

  async upsertGlobalContext(
    params: UpsertAiGlobalContextDto,
    jwt: IJwtPayload,
  ) {
    await this.assertResumeOwned(params.resumeId, jwt);
    return this.prisma.aiGlobalContext.upsert({
      where: {
        resumeId_key: { resumeId: params.resumeId, key: params.key },
      },
      create: {
        resumeId: params.resumeId,
        key: params.key,
        value: params.value,
      },
      update: { value: params.value },
    });
  }

  async deleteGlobalContext(
    params: DeleteAiGlobalContextDto,
    jwt: IJwtPayload,
  ) {
    await this.assertResumeOwned(params.resumeId, jwt);
    const existing = await this.prisma.aiGlobalContext.findUnique({
      where: {
        resumeId_key: { resumeId: params.resumeId, key: params.key },
      },
    });
    if (!existing) {
      throw new NotFoundException('全局上下文不存在');
    }
    return this.prisma.aiGlobalContext.delete({
      where: { id: existing.id },
    });
  }

  /**
   * 同步基础问答：落库用户消息 + 占位助手回复；后续在此接入 LangGraph / 百炼流式。
   */
  async sendChat(
    params: SendAiChatDto,
    jwt: IJwtPayload,
  ): Promise<SendAiChatDataDto> {
    const { resumeId, userMessage, selectedSectionIds, enableWebSearch } =
      params;
    await this.assertResumeOwned(resumeId, jwt);
    const webOn = isWebSearchRequestEnabled(enableWebSearch);

    const userTurnMeta: Prisma.InputJsonValue = {
      kind: 'user_turn',
      selectedSectionIds: selectedSectionIds ?? [],
      enableWebSearch: webOn,
    };

    const out = await this.prisma.$transaction(async (tx) => {
      let conversation = params.conversationId
        ? await tx.aiConversation.findFirst({
            where: {
              id: params.conversationId,
              resumeId,
              resume: { userId: jwt.id },
            },
          })
        : null;

      if (params.conversationId && !conversation) {
        throw new NotFoundException('对话不存在');
      }

      if (!conversation) {
        const purpose = params.purpose ?? AiConversationPurpose.BASIC_QA;
        conversation = await tx.aiConversation.create({
          data: {
            resumeId,
            purpose,
            threadId: randomUUID(),
            title: null,
          },
        });
      }

      const last = await tx.aiMessage.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      });
      const baseSeq = (last?.seq ?? -1) + 1;

      const userMsg = await tx.aiMessage.create({
        data: {
          conversationId: conversation.id,
          seq: baseSeq,
          role: AiMessageRole.user,
          text: userMessage,
          contentJson: userTurnMeta,
        },
        include: { toolCalls: true },
      });

      const placeholder =
        '【占位】模型与 LangGraph 编排尚未接入。用户消息已保存，可继续在此线程上接入百炼与工具链。';

      const assistantMsg = await tx.aiMessage.create({
        data: {
          conversationId: conversation.id,
          seq: baseSeq + 1,
          role: AiMessageRole.assistant,
          text: placeholder,
          providerMeta: { placeholder: true } as Prisma.InputJsonValue,
        },
        include: { toolCalls: true },
      });

      await tx.aiConversation.update({
        where: { id: conversation.id },
        data: { lastMsgAt: new Date() },
      });

      return {
        conversationId: conversation.id,
        threadId: conversation.threadId,
        selectedSectionIds: selectedSectionIds ?? [],
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    });

    await this.resolveAndPersistNewConversationTitle(
      params,
      out.conversationId,
    );
    return out;
  }

  /**
   * SSE：LangGraph `streamMode: ["messages","tools"]` → message / reasoning / tool 事件；
   * 用户消息先落库，流结束后写入助手整段文本。
   */
  async streamChat(params: SendAiChatDto, jwt: IJwtPayload, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let conversationId = 0;
    let threadId = '';
    const webSearchOn = isWebSearchRequestEnabled(params.enableWebSearch);

    try {
      await this.assertResumeOwned(params.resumeId, jwt);

      const { conversation, userMsg } = await this.prisma.$transaction(
        async (tx) => {
          let conversation = params.conversationId
            ? await tx.aiConversation.findFirst({
                where: {
                  id: params.conversationId,
                  resumeId: params.resumeId,
                  resume: { userId: jwt.id },
                },
              })
            : null;

          if (params.conversationId && !conversation) {
            throw new NotFoundException('对话不存在');
          }

          if (!conversation) {
            const purpose = params.purpose ?? AiConversationPurpose.BASIC_QA;
            conversation = await tx.aiConversation.create({
              data: {
                resumeId: params.resumeId,
                purpose,
                threadId: randomUUID(),
                title: null,
              },
            });
          }

          const last = await tx.aiMessage.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { seq: 'desc' },
            select: { seq: true },
          });
          const baseSeq = (last?.seq ?? -1) + 1;

          const userTurnMeta: Prisma.InputJsonValue = {
            kind: 'user_turn',
            selectedSectionIds: params.selectedSectionIds ?? [],
            enableWebSearch: webSearchOn,
            stream: true,
          };

          const userMsg = await tx.aiMessage.create({
            data: {
              conversationId: conversation.id,
              seq: baseSeq,
              role: AiMessageRole.user,
              text: params.userMessage,
              contentJson: userTurnMeta,
            },
            include: { toolCalls: true },
          });

          await tx.aiConversation.update({
            where: { id: conversation.id },
            data: { lastMsgAt: new Date() },
          });

          return { conversation, userMsg };
        },
      );

      conversationId = conversation.id;
      threadId = conversation.threadId;

      const metaTitle = await this.resolveAndPersistNewConversationTitle(
        params,
        conversationId,
      );

      this.writeSse(res, 'meta', {
        phase: 'meta',
        conversationId,
        payload: {
          threadId,
          userMessageId: userMsg.id,
          ...(metaTitle != null && metaTitle.length > 0
            ? { title: metaTitle }
            : {}),
        },
      });

      const systemPrompt = await buildBasicQaSystemPrompt(
        this.prisma,
        params.resumeId,
        jwt,
        {
          selectedSectionIds: params.selectedSectionIds,
          enableWebSearch: webSearchOn,
        },
      );

      let assistantText = '';
      let streamOk = true;

      for await (const ev of this.langgraph.streamBasicQa({
        threadId,
        userText: params.userMessage,
        systemPrompt,
        resumeId: params.resumeId,
        userId: jwt.id,
        suggestedSectionIds: params.selectedSectionIds,
        enableWebSearch: webSearchOn,
      })) {
        if (ev.kind === 'error') {
          this.writeSse(res, 'error', {
            phase: 'error',
            deltaText: ev.message,
            conversationId,
          });
          streamOk = false;
          break;
        }
        if (ev.kind === 'message') {
          assistantText += ev.deltaText;
          this.writeSse(res, 'message', {
            phase: 'message',
            deltaText: ev.deltaText,
            conversationId,
            payload: ev.payload,
          });
        } else if (ev.kind === 'reasoning') {
          this.writeSse(res, 'reasoning', {
            phase: 'reasoning',
            deltaText: ev.deltaText,
            conversationId,
            payload: ev.payload,
          });
        } else if (ev.kind === 'tool') {
          this.writeSse(res, 'tool', {
            phase: 'tool',
            conversationId,
            payload: ev.payload,
          });
        }
      }

      if (streamOk) {
        const last = await this.prisma.aiMessage.findFirst({
          where: { conversationId },
          orderBy: { seq: 'desc' },
          select: { seq: true },
        });
        const assistantSeq = (last?.seq ?? -1) + 1;

        const assistantMsg = await this.prisma.aiMessage.create({
          data: {
            conversationId,
            seq: assistantSeq,
            role: AiMessageRole.assistant,
            text: assistantText || null,
            providerMeta: {
              source: 'langgraph',
              stream: true,
            } as Prisma.InputJsonValue,
          },
          include: { toolCalls: true },
        });

        await this.prisma.aiConversation.update({
          where: { id: conversationId },
          data: { lastMsgAt: new Date() },
        });

        this.writeSse(res, 'done', {
          phase: 'done',
          conversationId,
          payload: {
            threadId,
            assistantMessageId: assistantMsg.id,
          },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'stream chat failed';
      this.writeSse(res, 'error', {
        phase: 'error',
        deltaText: message,
        ...(conversationId ? { conversationId } : {}),
      });
    } finally {
      res.end();
    }
  }
}
