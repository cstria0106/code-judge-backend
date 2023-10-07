import { Language } from '../problem/template';

type Languages = Record<
  Language,
  {
    compiler: {
      image: string;
      command: readonly string[];
      transforms?: readonly (
        | {
            type: 'replace_string';
            targets: readonly string[];
            from: string;
            to: string;
          }
        | {
            type: 'rename_file';
            target: string;
            to: string;
          }
      )[];
      environments?: Record<string, string>;
    };
    runtime: {
      image: string;
      command: readonly string[];
    };
    judgeCodeName: string;
    solutionCodeName: string;
    buildFiles: string[];
    timeLimitAdvantage?: (timeLimit: number) => number;
    memoryLimitAdvantage?: (memoryLimit: bigint) => bigint;
  }
>;

export const languages: Languages = {
  C: {
    compiler: {
      image: 'compiler-gcc',
      command: ['make'],
      transforms: [
        {
          type: 'replace_string',
          targets: ['judge.c', 'judge.h', 'main.c'],
          from: 'judge_',
          to: '_{{SUBMIT_ID}}_judge_',
        },
        {
          type: 'replace_string',
          targets: ['judge.c'],
          from: '{{SUBMIT_ID}}',
          to: '{{SUBMIT_ID}}',
        },
      ],
      environments: {
        BUILD_FLAGS: '-O2 -std=c11',
        CXX: 'gcc',
        MAIN: 'main.c',
        SOLUTION: 'solution.c',
      },
    },
    runtime: {
      image: 'runtime-binary',
      command: ['time', '-v', './main'],
    },
    solutionCodeName: 'solution.c',
    judgeCodeName: 'main.c',
    buildFiles: ['main'],
  },
  CPP: {
    compiler: {
      image: 'compiler-gcc',
      command: ['make'],
      transforms: [
        {
          type: 'replace_string',
          targets: ['judge.c', 'judge.h', 'main.cpp'],
          from: 'judge_',
          to: '_{{SUBMIT_ID}}_judge_',
        },
        {
          type: 'replace_string',
          targets: ['judge.c'],
          from: '{{SUBMIT_ID}}',
          to: '{{SUBMIT_ID}}',
        },
      ],
      environments: {
        BUILD_FLAGS: '-O2 -std=c++20',
        CXX: 'g++',
        MAIN: 'main.cpp',
        SOLUTION: 'solution.cpp',
      },
    },
    runtime: {
      image: 'runtime-binary',
      command: ['time', '-v', './main'],
    },
    solutionCodeName: 'solution.cpp',
    judgeCodeName: 'main.cpp',
    buildFiles: ['main'],
  },
  JAVA: {
    compiler: {
      image: 'compiler-jdk',
      command: ['javac', '-encoding', 'UTF-8', 'Main.java'],
      transforms: [
        {
          type: 'replace_string',
          targets: ['Judge.java'],
          from: 'public class Judge {',
          to: 'public class _{{SUBMIT_ID}}_Judge {',
        },
        {
          type: 'replace_string',
          targets: ['Judge.java'],
          from: '{{SUBMIT_ID}}',
          to: '{{SUBMIT_ID}}',
        },
        {
          type: 'rename_file',
          target: 'Judge.java',
          to: '_{{SUBMIT_ID}}_Judge.java',
        },
        {
          type: 'replace_string',
          targets: ['Main.java'],
          from: 'new Judge()',
          to: 'new _{{SUBMIT_ID}}_Judge()',
        },
        {
          type: 'replace_string',
          targets: ['Main.java'],
          from: 'new Judge.Reader()',
          to: 'new _{{SUBMIT_ID}}_Judge.Reader()',
        },
      ],
    },
    runtime: {
      image: 'runtime-java',
      command: [
        'time',
        '-v',
        'java',
        '-Xms256m',
        '-Xmx512m',
        '-Xss128m',
        '-Dfile.encoding=UTF-8',
        'Main',
      ],
    },
    solutionCodeName: 'Solution.java',
    judgeCodeName: 'Main.java',
    buildFiles: [
      'Main.class',
      'Solution.class',
      '_{{SUBMIT_ID}}_Judge.class',
      '_{{SUBMIT_ID}}_Judge$Reader.class',
    ],
    memoryLimitAdvantage: (limit) => limit + 200n * 1000n ** 1000n, // 200MB
  },
};
