import { IsString } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class SetPasswordDto {
  @IsString()
  @IsStrongPassword({
    message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password: string;
}
