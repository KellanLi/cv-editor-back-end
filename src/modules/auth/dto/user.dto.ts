import { UserTableDto as UserTableDto } from '@/common/dto/table/user.dto';
import { OmitType } from '@nestjs/swagger';
export class UserDto extends OmitType(UserTableDto, ['password', 'resumes']) {}
