import { NotFoundException } from '@nestjs/common';

export const ensure =
  <T>(name?: string) =>
  (value: T | null) => {
    if (value === null)
      throw new NotFoundException(name ? `${name} not found` : undefined);
    return value;
  };
