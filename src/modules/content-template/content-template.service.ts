import { PrismaService } from '@/provider/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ListDataDto, ListDto } from './dto/list.dto';
import { CreateDto } from './dto/create.dto';
import { UpdateDto } from './dto/update.dto';
import { DeleteDto } from './dto/delete.dto';
import { IJwtPayload } from '@/types/auth.types';

@Injectable()
export class ContentTemplateService {
  constructor(private prismaService: PrismaService) {}

  async list(params: ListDto, jwt: IJwtPayload): Promise<ListDataDto> {
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

  async create(params: CreateDto, jwt: IJwtPayload) {
    const { name, type, infoTemplates } = params;
    const res = await this.prismaService.contentTemplate.create({
      data: {
        userId: jwt.id,
        name: name,
        type: type,
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

  async update(params: UpdateDto, jwt: IJwtPayload) {
    const { id, type, name, infoTemplates } = params;
    const res = await this.prismaService.contentTemplate.update({
      where: {
        id,
        userId: jwt.id,
      },
      data: {
        type,
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

  async delete(params: DeleteDto, jwt: IJwtPayload) {
    const { id } = params;
    const res = await this.prismaService.contentTemplate.delete({
      where: {
        userId: jwt.id,
        id,
      },
    });
    return res;
  }
}
