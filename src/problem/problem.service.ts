import { Injectable } from '@nestjs/common';
import hljs, { Language } from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

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

@Injectable()
export class ProblemService {
  private marked: Marked;
  constructor(private readonly problems: ProblemRepository) {
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

  async get(id: bigint): Promise<ProblemService.get.Result> {
    const now = new Date();
    const problem = await this.problems.findOneOrThrow({
      id,
      startTimeIsBefore: now,
    });

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
    const problem = await this.problems.findOneWithArtifactsOrThrow(id);

    return { problem };
  }

  async manageCreate(): Promise<ProblemService.manageCreate.Result> {
    const problem = await this.problems.create({
      name: 'New problem',
      description:
        '# Hello, world!\nThis is new problem.\n\nPlease refer to the [Markdown Cheat Sheet](https://www.markdownguide.org/cheat-sheet/) to help you write new question.',
      artifacts: {
        inputs: {
          public: '',
          hidden: '',
        },
      },
      templates: exampleTemplate,
    });

    return { problem };
  }

  async manageUpdate(
    problemId: bigint,
    data: ProblemService.manageUpdate.Data,
  ): Promise<void> {
    const problem = await this.problems.findOneOrThrow({ id: problemId });
    await this.problems.update(problem.id, data);
  }

  async manageDestroy(problemId: bigint): Promise<void> {
    const problem = await this.problems.findOneOrThrow({ id: problemId });
    await this.problems.delete(problem.id);
  }
}
