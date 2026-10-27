import { IsOptional, IsString, MaxLength } from 'class-validator';

// Self-service profile update — intentionally limited to fullName so a user
// cannot change their own role, tier, or active status through this endpoint.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
