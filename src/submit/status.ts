type SubmitWaiting = {
  type: 'WAITING';
};

type SubmitCompiling = {
  type: 'COMPILING';
};

type SubmitReady = {
  type: 'READY';
};

type SubmitRunning = {
  type: 'RUNNING';
  progress: number;
};

type SubmitComplete = {
  type: 'COMPLETE';
  result: SubmitResult;
};

type SubmitResult =
  | {
      type: 'FAILED';
      reason:
        | 'WRONG'
        | 'TIME_LIMIT_EXCEED'
        | 'MEMORY_LIMIT_EXCEED'
        | 'RUNTIME_ERROR';
    }
  | { type: 'COMPILE_ERROR'; message: string }
  | {
      type: 'SUCCESS';
      time: number;
      memory: number;
    }
  | {
      type: 'UNKNOWN_ERROR';
    };

export type SubmitStatus =
  | SubmitWaiting
  | SubmitCompiling
  | SubmitReady
  | SubmitRunning
  | SubmitComplete;

export namespace SubmitStatus {
  export const waiting = () =>
    ({
      type: 'WAITING',
    }) as const;
  export const compiling = () =>
    ({
      type: 'COMPILING',
    }) as const;
  export const ready = () =>
    ({
      type: 'READY',
    }) as const;
  export const running = (progress: number) =>
    ({
      type: 'RUNNING',
      progress,
    }) as const;
  export const success = (memory: number, time: number) =>
    ({
      type: 'COMPLETE',
      result: { type: 'SUCCESS', memory, time },
    }) as const;
  export const failed = (
    reason: Extract<SubmitResult, { type: 'FAILED' }>['reason'],
  ) =>
    ({
      type: 'COMPLETE',
      result: { type: 'FAILED', reason },
    }) as const;
  export const compileError = (message: string) =>
    ({
      type: 'COMPLETE',
      result: { type: 'COMPILE_ERROR', message },
    }) as const;
  export const unknownError = () =>
    ({
      type: 'COMPLETE',
      result: { type: 'UNKNOWN_ERROR' },
    }) as const;
}
