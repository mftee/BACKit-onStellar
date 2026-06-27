import { IsEnum } from 'class-validator';
import { ReportReason } from '../entities/call-report.entity';

export class ReportCallDto {
  @IsEnum(ReportReason)
  reason: ReportReason;
}
