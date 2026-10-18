import { IsEmail, IsObject, IsString, MaxLength, MinLength } from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

export class WebAuthnLoginOptionsDto {
  @IsEmail()
  email: string;
}

export class WebAuthnLoginVerifyDto {
  @IsEmail()
  email: string;

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
