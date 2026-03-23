import { PrismaService } from '@/provider/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ListDto } from './dto/list.dto';
import { CreateDto } from './dto/create.dto';
import { UpdateDto } from './dto/update.dto';
import { DeleteDto } from './dto/delete.dto';

@Injectable()
export class SectionService {
  constructor(private prismaService: PrismaService) {}

  async list(params: ListDto) {
    const { filter, pagination } = params;
    const { infoTemplateTypes, name } = filter;
    const { page, pageSize } = pagination;

    const res = await this.prismaService.section.findMany({
      where: {
        contentTemplate: {
          infoTemplates: {
            some: {
              type: { in: infoTemplateTypes },
            },
          },
        },
        name: { contains: name || '' },
      },
      include: {
        contentTemplate: {
          include: {
            infoTemplates: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return res;
  }
  async create(params: CreateDto) {
    const { name, infoTemplates } = params;
    const res = await this.prismaService.section.create({
      data: {
        name: name,
        contentTemplate: {
          create: {
            infoTemplates: {
              create: infoTemplates,
            },
          },
        },
      },
      include: {
        contentTemplate: {
          include: {
            infoTemplates: true,
          },
        },
      },
    });
    return res;
  }

  async update(params: UpdateDto) {
    const { sectionId, name, infoTemplates } = params;
    const res = await this.prismaService.section.update({
      where: {
        id: sectionId,
      },
      data: {
        name: name,
        contentTemplate: {
          update: {
            infoTemplates: {
              deleteMany: {},
              create: infoTemplates,
            },
          },
        },
      },
      include: {
        contentTemplate: {
          include: {
            infoTemplates: true,
          },
        },
      },
    });
    return res;
  }

  async delete(params: DeleteDto) {
    const { sectionId } = params;
    await this.prismaService.section.delete({
      where: {
        id: sectionId,
      },
    });
  }
}
