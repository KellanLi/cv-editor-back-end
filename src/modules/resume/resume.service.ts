import { PrismaService } from '@/provider/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ListResumeDataDto, ListResumeDto } from './dto/list.dto';
import { CreateResumeDto } from './dto/create.dto';
import { DeleteResumeDto } from './dto/delete.dto';
import { IJwtPayload } from '@/types/auth.types';
import type { Resume } from '@/generated/client';

@Injectable()
export class ResumeService {
  constructor(private prismaService: PrismaService) {}

  async list(
    params: ListResumeDto,
    jwt: IJwtPayload,
  ): Promise<ListResumeDataDto> {
    const { filter, pagination } = params;
    const { title } = filter;
    const { page, pageSize } = pagination;

    const where = {
      title: { contains: title || '' },
      userId: jwt.id,
    };

    const [list, total] = await this.prismaService.$transaction([
      this.prismaService.resume.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.resume.count({ where }),
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

  async create(params: CreateResumeDto, jwt: IJwtPayload): Promise<Resume> {
    const { title } = params;
    return this.prismaService.resume.create({
      data: {
        userId: jwt.id,
        title,
      },
    });
  }

  async delete(params: DeleteResumeDto, jwt: IJwtPayload): Promise<Resume> {
    const { id } = params;
    const existing = await this.prismaService.resume.findFirst({
      where: { id, userId: jwt.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('简历不存在');
    }

    return this.prismaService.$transaction(async (tx) => {
      const contents = await tx.content.findMany({
        where: { section: { resumeId: id } },
        select: { id: true },
      });
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length > 0) {
        await tx.info.deleteMany({ where: { contentId: { in: contentIds } } });
      }
      await tx.content.deleteMany({
        where: { section: { resumeId: id } },
      });
      await tx.section.deleteMany({ where: { resumeId: id } });
      return tx.resume.delete({ where: { id, userId: jwt.id } });
    });
  }
}
