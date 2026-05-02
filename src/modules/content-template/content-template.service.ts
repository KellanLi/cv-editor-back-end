import { PrismaService } from '@/provider/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@/generated/client';
import { ListContentTemplateDto } from './dto/list.dto';
import { CreateContentTemplateDto } from './dto/create.dto';
import { UpdateContentTemplateDto } from './dto/update.dto';
import { DeleteContentTemplateDto } from './dto/delete.dto';
import { IJwtPayload } from '@/types/auth.types';

@Injectable()
export class ContentTemplateService {
  constructor(private prismaService: PrismaService) {}

  /**
   * 当前用户拥有的单条内容模板（含 infoTemplates，按 order 升序）。
   */
  async findByIdForUser(
    id: number,
    jwt: IJwtPayload,
  ): Promise<
    Prisma.ContentTemplateGetPayload<{
      include: { infoTemplates: true };
    }>
  > {
    const res = await this.prismaService.contentTemplate.findFirst({
      where: { id, userId: jwt.id },
      include: {
        infoTemplates: { orderBy: { order: 'asc' } },
      },
    });
    if (!res) {
      throw new NotFoundException('内容模板不存在');
    }
    return res;
  }

  async list(params: ListContentTemplateDto, jwt: IJwtPayload) {
    const { filter, pagination } = params;
    const { name } = filter;
    const { page, pageSize } = pagination;

    const where = {
      name: { contains: name || '' },
      userId: jwt.id,
    };

    const [list, total] = await this.prismaService.$transaction([
      this.prismaService.contentTemplate.findMany({
        where,
        include: {
          infoTemplates: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.contentTemplate.count({
        where,
      }),
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

  async create(params: CreateContentTemplateDto, jwt: IJwtPayload) {
    const { name, infoTemplates } = params;
    const res = await this.prismaService.contentTemplate.create({
      data: {
        userId: jwt.id,
        name: name,
        infoTemplates: {
          create: infoTemplates,
        },
      },
      include: {
        infoTemplates: true,
      },
    });
    return res;
  }

  async update(params: UpdateContentTemplateDto, jwt: IJwtPayload) {
    const { id, name, infoTemplates } = params;
    const res = await this.prismaService.contentTemplate.update({
      where: {
        id,
        userId: jwt.id,
      },
      data: {
        name,
        infoTemplates: {
          deleteMany: {},
          create: infoTemplates,
        },
      },
      include: {
        infoTemplates: true,
      },
    });

    return res;
  }

  async delete(params: DeleteContentTemplateDto, jwt: IJwtPayload) {
    const { id } = params;
    const existing = await this.prismaService.contentTemplate.findFirst({
      where: { id, userId: jwt.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('内容模板不存在');
    }
    const [, res] = await this.prismaService.$transaction([
      this.prismaService.infoTemplate.deleteMany({
        where: { contentTemplateId: id },
      }),
      this.prismaService.contentTemplate.delete({
        where: { id, userId: jwt.id },
      }),
    ]);
    return res;
  }
}
