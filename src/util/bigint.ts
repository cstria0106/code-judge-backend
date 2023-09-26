import { BadRequestException } from '@nestjs/common';

export function bigint(value: string | number, resource?: string): bigint;
export function bigint(
  value: string | number | null,
  resource?: string,
): bigint | null;
export function bigint(
  value?: string | number,
  resource?: string,
): bigint | undefined;
export function bigint(value?: string | number | null, resource?: string) {
  if (value === undefined || value === null) return value;

  if (typeof value === 'string') {
    if (!/^\d+$/.test(value))
      throw new BadRequestException(
        `Invalid bigint${resource ? ` ${resource}` : ''}`,
      );
  }

  return BigInt(value);
}
