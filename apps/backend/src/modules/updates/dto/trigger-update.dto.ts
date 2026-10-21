import { Matches } from 'class-validator';

export class TriggerUpdateDto {
  // "latest" (resolved to the newest published version) or an exact x.y.z tag.
  @Matches(/^(latest|\d+\.\d+\.\d+)$/, {
    message: 'target must be "latest" or a version like 1.2.3',
  })
  target: string;
}
