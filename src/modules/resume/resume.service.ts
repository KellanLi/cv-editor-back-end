import { PrismaService } from '@/provider/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListResumeDto } from './dto/list.dto';
import { CreateResumeDto } from './dto/create.dto';
import { DeleteResumeDto } from './dto/delete.dto';
import { DetailResumeDto } from './dto/detail.dto';
import { UpdateResumeTitleDto } from './dto/update-title.dto';
import { UpdateResumeListCoverDto } from './dto/update-list-cover.dto';
import { UpdateResumeProfileDto } from './dto/update-profile.dto';
import { UpdateResumeJobDescriptionDto } from './dto/update-job-description.dto';
import { IJwtPayload } from '@/types/auth.types';
import { Prisma } from '@/generated/client';
import { StreamResumeUpdatesDto } from './dto/stream-updates.dto';
import { ResumeUpdatesService } from '@/provider/resume-updates/resume-updates.service';
import type { Response } from 'express';

@Injectable()
export class ResumeService {
  constructor(
    private prismaService: PrismaService,
    private readonly resumeUpdatesService: ResumeUpdatesService,
  ) {}

  private async assertResumeOwnedOrThrow(resumeId: number, userId: number) {
    const resume = await this.prismaService.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!resume) {
      throw new NotFoundException('简历不存在');
    }
  }

  async list(params: ListResumeDto, jwt: IJwtPayload) {
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
        include: { profile: true },
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

  async detail(params: DetailResumeDto, jwt: IJwtPayload) {
    const { id } = params;
    await this.assertResumeOwnedOrThrow(id, jwt.id);
    return this.prismaService.resume.findFirstOrThrow({
      where: { id, userId: jwt.id },
      include: { profile: true },
    });
  }

  async updateJobDescription(
    params: UpdateResumeJobDescriptionDto,
    jwt: IJwtPayload,
  ) {
    const { id, jobDescriptionText } = params;
    const existing = await this.prismaService.resume.findFirst({
      where: { id, userId: jwt.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('简历不存在');
    }
    const updated = await this.prismaService.resume.update({
      where: { id, userId: jwt.id },
      data: { jobDescriptionText },
      include: { profile: true },
    });
    this.resumeUpdatesService.publishToResume(jwt.id, {
      resumeId: id,
      trigger: 'resume.update-job-description',
    });
    return updated;
  }

  async updateListCover(params: UpdateResumeListCoverDto, jwt: IJwtPayload) {
    const { id, listCoverImageUrl } = params;
    if (listCoverImageUrl === undefined) {
      throw new BadRequestException(
        '请提供 listCoverImageUrl（可用 `null` 清空）',
      );
    }
    const existing = await this.prismaService.resume.findFirst({
      where: { id, userId: jwt.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('简历不存在');
    }
    const updated = await this.prismaService.resume.update({
      where: { id, userId: jwt.id },
      data: { listCoverImageUrl },
      include: { profile: true },
    });
    this.resumeUpdatesService.publishToResume(jwt.id, {
      resumeId: id,
      trigger: 'resume.update-list-cover',
    });
    return updated;
  }

  async updateTitle(params: UpdateResumeTitleDto, jwt: IJwtPayload) {
    const { id, title } = params;
    const existing = await this.prismaService.resume.findFirst({
      where: { id, userId: jwt.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('简历不存在');
    }
    const updated = await this.prismaService.resume.update({
      where: { id, userId: jwt.id },
      data: { title },
      include: { profile: true },
    });
    this.resumeUpdatesService.publishToResume(jwt.id, {
      resumeId: id,
      trigger: 'resume.update-title',
    });
    return updated;
  }

  async updateProfile(dto: UpdateResumeProfileDto, jwt: IJwtPayload) {
    const { id: resumeId, profileExtra, ...rest } = dto;
    const data: {
      photoUrl?: string | null;
      fullName?: string | null;
      birthDate?: Date | null;
      gender?: string | null;
      targetPosition?: string | null;
      email?: string | null;
      phone?: string | null;
      profileExtra?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    } = {
      ...rest,
      ...(profileExtra !== undefined
        ? {
            profileExtra:
              profileExtra === null
                ? Prisma.JsonNull
                : (profileExtra as Prisma.InputJsonValue),
          }
        : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('请至少提供一个要修改的字段');
    }

    const existing = await this.prismaService.resume.findFirst({
      where: { id: resumeId, userId: jwt.id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('简历不存在');
    }
    await this.prismaService.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.resumeProfile.upsert({
          where: { resumeId },
          create: {
            resume: { connect: { id: resumeId } },
            ...data,
          },
          update: data,
        });
        await tx.resume.update({
          where: { id: resumeId, userId: jwt.id },
          data: { updatedAt: new Date() },
        });
      },
    );
    const updated = await this.prismaService.resume.findFirstOrThrow({
      where: { id: resumeId, userId: jwt.id },
      include: { profile: true },
    });
    this.resumeUpdatesService.publishToResume(jwt.id, {
      resumeId,
      trigger: 'resume.update-profile',
    });
    return updated;
  }

  async streamUpdates(
    params: StreamResumeUpdatesDto,
    jwt: IJwtPayload,
    res: Response,
  ) {
    await this.assertResumeOwnedOrThrow(params.resumeId, jwt.id);
    await this.resumeUpdatesService.streamResumeUpdates({
      userId: jwt.id,
      resumeId: params.resumeId,
      res,
    });
  }

  async create(params: CreateResumeDto, jwt: IJwtPayload) {
    const { title, listCoverImageUrl, jobDescriptionText } = params;
    return this.prismaService.resume.create({
      data: {
        userId: jwt.id,
        title,
        ...(listCoverImageUrl != null
          ? { listCoverImageUrl: listCoverImageUrl }
          : {}),
        ...(jobDescriptionText !== undefined
          ? { jobDescriptionText }
          : {}),
        profile: { create: {} },
      },
      include: { profile: true },
    });
  }

  async delete(params: DeleteResumeDto, jwt: IJwtPayload) {
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
      return tx.resume.delete({
        where: { id, userId: jwt.id },
        include: { profile: true },
      });
    });
  }
}
