import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 101, description: 'ID of the related order' })
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiProperty({
    example: 'ORDER_SUBMITTED_TO_NESTTEST',
    description: 'Event type (domain-specific event identifier)',
  })
  @IsString()
  type!: string;

  @ApiProperty({
    example: '{"note":"optional metadata"}',
    required: false,
    description: 'Optional JSON payload string',
  })
  @IsOptional()
  @IsString()
  payload?: string;
}
