import { BadRequestException } from '@nestjs/common';

export function bigint(value: string, resource?: string): bigint;
export function bigint(value: string | null, resource?: string): bigint | null;
export function bigint(value?: string, resource?: string): bigint | undefined;
export function bigint(value?: string | null, resource?: string) {
  if (value === undefined || value === null) return value;

  if (!/^\d+$/.test(value))
    throw new BadRequestException(
      `Invalid bigint${resource ? ` ${resource}` : ''}`,
    );

  return BigInt(value);
}
