import { OmitType } from '@nestjs/swagger';
import { InfoTableDto } from '@/common/dto/table/info.dto';

/** 信息层 API 响应：不含 `content` 反向嵌套。 */
export class InfoDto extends OmitType(InfoTableDto, ['content']) {}
