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
