import { PrismaService } from '@/provider/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSectionDto } from './dto/create.dto';
import { DeleteSectionDto } from './dto/delete.dto';
import { ListSectionDto } from './dto/list.dto';
import { UpdateSectionContentDto } from './dto/update-content.dto';
import { UpdateSectionDto } from './dto/update.dto';
import { ReorderSectionDto } from './dto/reorder.dto';
import { IJwtPayload } from '@/types/auth.types';
import type { Prisma } from '@/generated/client';
import { ResumeUpdatesService } from '@/provider/resume-updates/resume-updates.service';

const sectionInclude = {
  contents: {
    orderBy: { order: 'asc' as const },
    include: {
      infos: { orderBy: { order: 'asc' as const } },
    },
  },
} satisfies Prisma.SectionInclude;

type SectionWithContents = Prisma.SectionGetPayload<{
  include: typeof sectionInclude;
}>;

function emptyValuesForTemplate(
  names: Prisma.JsonValue,
): Prisma.InputJsonValue {
  if (Array.isArray(names)) {
    return names.map(() => '');
  }
  return [];
}

@Injectable()
export class SectionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly resumeUpdatesService: ResumeUpdatesService,
  ) {}

  private async assertResumeOwned(
    resumeId: number,
    userId: number,
  ): Promise<void> {
    const resume = await this.prismaService.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }
  }

  private async getSectionOwnedOrThrow(
    sectionId: number,
    userId: number,
  ): Promise<{ id: number; resumeId: number }> {
    const section = await this.prismaService.section.findFirst({
      where: { id: sectionId, resume: { userId } },
      select: { id: true, resumeId: true },
    });
    if (!section) {
      throw new NotFoundException('模块不存在');
    }
    return section;
  }

  private async touchResumeAndPublish(params: {
    resumeId: number;
    userId: number;
    trigger:
      | 'section.create'
      | 'section.delete'
      | 'section.update'
      | 'section.reorder'
      | 'section.update-content';
    sectionId?: number;
  }) {
    await this.prismaService.resume.updateMany({
      where: { id: params.resumeId, userId: params.userId },
      data: { updatedAt: new Date() },
    });
    this.resumeUpdatesService.publishToResume(params.userId, {
      resumeId: params.resumeId,
      trigger: params.trigger,
      sectionId: params.sectionId,
    });
  }

  async list(params: ListSectionDto, jwt: IJwtPayload) {
    const { filter, pagination } = params;
    const { resumeId } = filter;
    const { page, pageSize } = pagination;

    await this.assertResumeOwned(resumeId, jwt.id);

    const where = { resumeId };

    const [list, total] = await this.prismaService.$transaction([
      this.prismaService.section.findMany({
        where,
        include: sectionInclude,
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.section.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
      },
    };
  }

  async create(params: CreateSectionDto, jwt: IJwtPayload) {
    const { resumeId, contentTemplateId, order } = params;
    await this.assertResumeOwned(resumeId, jwt.id);

    const template = await this.prismaService.contentTemplate.findFirst({
      where: { id: contentTemplateId, userId: jwt.id },
      include: {
        infoTemplates: { orderBy: { order: 'asc' } },
      },
    });
    if (!template) {
      throw new NotFoundException('内容模板不存在');
    }

    const created = await this.prismaService.$transaction(async (tx) => {
      const section = await tx.section.create({
        data: {
          resumeId,
          contentTemplateId,
          order,
        },
      });

      if (template.infoTemplates.length > 0) {
        await tx.content.create({
          data: {
            sectionId: section.id,
            order: 1,
            infos: {
              create: template.infoTemplates.map((it) => ({
                order: it.order,
                type: it.type,
                values: emptyValuesForTemplate(it.names),
              })),
            },
          },
        });
      }

      return tx.section.findUniqueOrThrow({
        where: { id: section.id },
        include: sectionInclude,
      });
    });
    await this.touchResumeAndPublish({
      resumeId,
      userId: jwt.id,
      trigger: 'section.create',
      sectionId: created.id,
    });
    return created;
  }

  async delete(
    params: DeleteSectionDto,
    jwt: IJwtPayload,
  ): Promise<SectionWithContents> {
    const { id } = params;
    const ownedSection = await this.getSectionOwnedOrThrow(id, jwt.id);

    const snapshot = await this.prismaService.section.findFirst({
      where: { id, resume: { userId: jwt.id } },
      include: sectionInclude,
    });
    if (!snapshot) {
      throw new NotFoundException('模块不存在');
    }

    await this.prismaService.$transaction(async (tx) => {
      const contents = await tx.content.findMany({
        where: { sectionId: id },
        select: { id: true },
      });
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length > 0) {
        await tx.info.deleteMany({ where: { contentId: { in: contentIds } } });
      }
      await tx.content.deleteMany({ where: { sectionId: id } });
      await tx.section.delete({ where: { id } });
    });
    await this.touchResumeAndPublish({
      resumeId: ownedSection.resumeId,
      userId: jwt.id,
      trigger: 'section.delete',
      sectionId: id,
    });

    return snapshot;
  }

  async update(
    params: UpdateSectionDto,
    jwt: IJwtPayload,
  ): Promise<SectionWithContents> {
    const { id, order } = params;
    const ownedSection = await this.getSectionOwnedOrThrow(id, jwt.id);

    await this.prismaService.section.update({
      where: { id },
      data: { order },
    });
    await this.touchResumeAndPublish({
      resumeId: ownedSection.resumeId,
      userId: jwt.id,
      trigger: 'section.update',
      sectionId: id,
    });

    return this.prismaService.section.findUniqueOrThrow({
      where: { id },
      include: sectionInclude,
    });
  }

  async reorder(params: ReorderSectionDto, jwt: IJwtPayload) {
    const { resumeId, items } = params;
    await this.assertResumeOwned(resumeId, jwt.id);

    if (items.length === 0) {
      const list = await this.prismaService.section.findMany({
        where: { resumeId },
        include: sectionInclude,
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      });
      return { list };
    }

    const ids = items.map((it) => it.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException('模块ID存在重复');
    }

    const owned = await this.prismaService.section.findMany({
      where: { id: { in: ids }, resumeId },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      throw new NotFoundException('存在不属于该简历的模块');
    }

    await this.prismaService.$transaction(
      items.map((it) =>
        this.prismaService.section.update({
          where: { id: it.id },
          data: { order: it.order },
        }),
      ),
    );

    const list = await this.prismaService.section.findMany({
      where: { resumeId },
      include: sectionInclude,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    await this.touchResumeAndPublish({
      resumeId,
      userId: jwt.id,
      trigger: 'section.reorder',
    });
    return { list };
  }

  async updateContent(
    params: UpdateSectionContentDto,
    jwt: IJwtPayload,
  ): Promise<SectionWithContents> {
    const { sectionId, contents } = params;
    const ownedSection = await this.getSectionOwnedOrThrow(sectionId, jwt.id);

    const updated = await this.prismaService.$transaction(async (tx) => {
      const existingContents = await tx.content.findMany({
        where: { sectionId },
        select: { id: true },
      });
      const contentIds = existingContents.map((c) => c.id);
      if (contentIds.length > 0) {
        await tx.info.deleteMany({ where: { contentId: { in: contentIds } } });
      }
      await tx.content.deleteMany({ where: { sectionId } });

      const sorted = [...contents].sort((a, b) => a.order - b.order);
      for (const item of sorted) {
        const infosSorted = [...item.infos].sort((a, b) => a.order - b.order);
        await tx.content.create({
          data: {
            sectionId,
            order: item.order,
            infos: {
              create: infosSorted.map((info) => ({
                order: info.order,
                type: info.type,
                values: info.values as Prisma.InputJsonValue,
              })),
            },
          },
        });
      }

      return tx.section.findUniqueOrThrow({
        where: { id: sectionId },
        include: sectionInclude,
      });
    });
    await this.touchResumeAndPublish({
      resumeId: ownedSection.resumeId,
      userId: jwt.id,
      trigger: 'section.update-content',
      sectionId,
    });
    return updated;
  }
}
