import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ActionReportDto {
  @ApiProperty({
    description: 'Whether to also ban the creator of the call',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  banCreator?: boolean;
}
