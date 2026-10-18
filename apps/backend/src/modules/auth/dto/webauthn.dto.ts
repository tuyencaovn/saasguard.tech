import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

export class WebAuthnLoginVerifyDto {
  @IsObject()
  response: AuthenticationResponseJSON;
}

export class WebAuthnRegisterVerifyDto {
  @IsObject()
  response: RegistrationResponseJSON;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
