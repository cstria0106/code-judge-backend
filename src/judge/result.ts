export type JudgeResult =
  | {
      type: 'SUCCESS';
      time: number;
      memory: number;
    }
  | {
      type: 'FAILED';
      reason:
        | 'WRONG'
        | 'TIME_LIMIT_EXCEED'
        | 'MEMORY_LIMIT_EXCEED'
        | 'RUNTIME_ERROR';
    };
