export type CompileResult =
  | {
      type: 'SUCCESS';
      files: Record<string, string>;
    }
  | {
      type: 'FAILED';
      message: string;
    }
  | {
      type: 'NO_RESOURCE';
    };
