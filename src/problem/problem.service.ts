import { Injectable, NotFoundException } from '@nestjs/common';
import hljs, { Language } from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

import { FileRepository } from '../storage/file.repository';
import { StorageService } from '../storage/storage.service';
import { UserRepository } from '../user/user.repository';
import { bigint } from '../util/bigint';
import { ensure } from '../util/ensure';
import { Artifacts } from './artifacts';
import { exampleTemplate } from './example-template';
import { ProblemRepository } from './problem.repository';
import { Codes, Templates } from './template';

export module ProblemService {
  export module list {
    export type Options = {
      cursor?: bigint;
      all?: boolean;
    };

    export type Result = {
      problems: {
        id: bigint;
        name: string;
        startTime: Date | null;
        endTime: Date | null;
        timeLimit: number;
        memoryLimit: bigint;
      }[];
    };
  }

  export module get {
    export type Result = {
      problem: {
        id: bigint;
        name: string;
        description: string;
        startTime: Date | null;
        endTime: Date | null;
        templates: Codes;
        timeLimit: number;
        memoryLimit: bigint;
      };
    };
  }

  export module listSubmits {
    export type Options = {
      onlySuccess: true;
      skip?: number;
      sort?: 'time' | 'memory';
    };

    export type Result = {
      submits: {
        language: Language;
        time: number;
        memory: number;
      };
    }[];
  }

  export module manageList {
    export type Result = {
      problems: {
        id: bigint;
        name: string;
        startTime: Date | null;
        endTime: Date | null;
        timeLimit: number;
        memoryLimit: bigint;
      }[];
    };
  }

  export module manageGet {
    export type Result = {
      problem: {
        id: bigint;
        name: string;
        description: string;
        startTime: Date | null;
        endTime: Date | null;
        artifacts: Artifacts;
        templates: Templates;
        timeLimit: number;
        memoryLimit: bigint;
      };
    };
  }

  export module manageUpdate {
    export type Data = {
      name?: string;
      description?: string;
      artifacts?: Artifacts;
      templates?: Templates;
      startTime?: Date | null;
      endTime?: Date | null;
      timeLimit?: number;
      memoryLimit?: bigint;
    };
  }

  export module manageCreate {
    export type Result = {
      problem: {
        id: bigint;
      };
    };
  }
}

const keys = <T extends object>(obj: T) => Object.keys(obj) as Array<keyof T>;

@Injectable()
export class ProblemService {
  private marked: Marked;
  constructor(
    private readonly problems: ProblemRepository,
    private readonly storage: StorageService,
    private readonly files: FileRepository,
    private readonly users: UserRepository,
  ) {
    this.marked = new Marked(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        },
      }),
    );
  }

  async list(
    options: ProblemService.list.Options,
  ): Promise<ProblemService.list.Result> {
    const now = new Date();

    const problems = await this.problems.findMany(
      {
        startTimeIsBefore: now,
        ...(options.all === true
          ? undefined
          : {
              endTimeIsNullOrAfter: now,
            }),
      },
      {
        cursor:
          options.cursor !== undefined ? { id: options.cursor } : undefined,
        take: options.all === true ? 20 : undefined,
      },
    );

    return { problems };
  }

  async get(
    id: bigint,
    options?: { userId: string },
  ): Promise<ProblemService.get.Result> {
    const now = new Date();
    let problem = await this.problems.findOneOrThrow({
      id,
    });

    // Allow admin to get problem before start
    if (problem.startTime !== null && problem.startTime > now) {
      if (options?.userId === undefined) {
        throw new NotFoundException('problem not found');
      }

      const user = await this.users.findOneOrThrow({
        id: options.userId,
      });
      if (user.role !== 'ADMIN') {
        throw new NotFoundException('problem not found');
      }
    }

    problem.description = await this.marked.parse(problem.description);

    return {
      problem: {
        ...problem,
        templates: problem.templates.solution,
      },
    };
  }

  async manageList(): Promise<ProblemService.manageList.Result> {
    const problems = await this.problems.findMany({}, {});
    return { problems };
  }

  async manageGet(id: bigint): Promise<ProblemService.manageGet.Result> {
    const problem = await this.problems.findOneOrThrow({ id });

    return { problem };
  }

  async manageCreate(): Promise<ProblemService.manageCreate.Result> {
    const problem = await this.problems.create({
      name: 'New problem',
      description:
        '# Hello, world!\nThis is new problem.\n\nPlease refer to the [Markdown Cheat Sheet](https://www.markdownguide.org/cheat-sheet/) to help you write new question.',
      artifacts: {
        inputs: {},
      },
      templates: exampleTemplate,
    });

    return { problem };
  }

  async manageUpdate(
    problemId: bigint,
    data: ProblemService.manageUpdate.Data,
  ): Promise<void> {
    const problem = await this.problems.findOneOrThrow({
      id: problemId,
    });

    await this.problems.update(problem.id, data);
  }

  async manageDestroy(problemId: bigint): Promise<void> {
    const problem = await this.problems.findOneOrThrow({ id: problemId });
    await this.problems.delete(problem.id);

    // Delete artifacts
    for (const name of keys(problem.artifacts.inputs)) {
      const id = problem.artifacts.inputs[name];
      if (id !== undefined) {
        try {
          await this.storage.destroy(id);
        } catch (e) {}
      }
    }
  }
}
