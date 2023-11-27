import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import MemoryStream from 'memorystream';
import PQueue from 'p-queue-compat';
import readline from 'readline';
import { Readable } from 'stream';
import { setTimeout } from 'timers/promises';
import { P, match } from 'ts-pattern';
import typia from 'typia';

import { languages } from '../language/languages';
import { Language } from '../problem/template';
import { JudgeResult } from './result';

@Injectable()
export class JudgeService {
  private readonly docker: Docker;
  private readonly queue: PQueue;

  private readonly logger: Logger = new Logger(JudgeService.name);

  private readonly memoryLimit: number | undefined;
  private readonly cpuCount: number | undefined;

  constructor(config: ConfigService) {
    this.docker = new Docker({ Promise: Promise });
    this.queue = new PQueue({ concurrency: 1 });

    const memoryLimitConfig = typia.assert(
      config.get<`${number}` | undefined>('JUDGE_MEMORY_LIMIT'),
    );
    this.memoryLimit =
      memoryLimitConfig !== undefined ? Number(memoryLimitConfig) : undefined;

    const cpuCountConfig = typia.assert(
      config.get<`${number}` | undefined>('JUDGE_CPU_COUNT'),
    );
    this.cpuCount =
      cpuCountConfig !== undefined ? Number(cpuCountConfig) : undefined;
  }

  enqueue(
    submitId: string,
    language: Language,
    files: Record<string, string>,
    input: Readable,
    timeLimit: number,
    memoryLimit: bigint,
    onStarted: () => void,
    onProgress: (progress: number) => void,
  ) {
    return this.queue.add(
      async () => {
        onStarted();

        return this.judge(
          submitId,
          language,
          files,
          input,
          timeLimit,
          memoryLimit,
          onProgress,
        );
      },
      { throwOnTimeout: true },
    );
  }

  private async judge(
    submitId: string,
    language: Language,
    files: Record<string, string>,
    input: Readable,
    rawTimeLimit: number,
    rawMemoryLimit: bigint,
    onProgress: (progress: number) => void,
  ): Promise<JudgeResult> {
    const lang = languages[language];
    const timeLimit = lang.timeLimitAdvantage?.(rawTimeLimit) ?? rawTimeLimit;
    const memoryLimit =
      lang.memoryLimitAdvantage?.(rawMemoryLimit) ?? rawMemoryLimit;

    const container = await this.docker.createContainer({
      Image: lang.runtime.image,
      Cmd: lang.runtime.command.slice(),
      WorkingDir: '/app',
      NetworkDisabled: true,
      HostConfig: {
        Mounts: Object.entries(files).map(([name, path]) => ({
          Type: 'bind',
          Source: path,
          Target: `/app/${name}`,
          ReadOnly: true,
        })),
        Memory: this.memoryLimit,
        CpuCount: this.cpuCount,
      },
      AttachStdout: true,
      AttachStdin: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: true,
    });

    const output = new MemoryStream();
    const lineReader = readline.createInterface(output);

    const debugTextMaxLength = 8092;
    let debugText = '';

    const handleOutput = new Promise<
      { ok: true; time: number; memory: number } | { ok: false }
    >((resolve) => {
      let ended = false;

      let resolved = false;

      let succeed = false;
      let time = 0;
      let memory = 0;

      const fail = () => {
        resolved = true;
        succeed = false;
        resolve({ ok: false });
      };

      const success = (time: number, memory: number) => {
        resolved = true;
        resolve({ ok: true, time, memory });
      };

      const onJudgeMessage = (message: string) => {
        // Success
        const timeMatch = message.match(/^SUCCESS (\d+)$/);
        if (timeMatch !== null) {
          succeed = true;
          ended = true;
          time = Number(timeMatch[1]);

          return;
        }

        // Any message after success is not allowed
        if (succeed) {
          this.logger.warn(`[${submitId}] Invalid message printed: ${message}`);
          return fail();
        }

        // Debug
        const debugMatch = message.match(/^DEBUG (.+)$/);
        if (debugMatch !== null) {
          if (debugText.length >= debugTextMaxLength) {
            return;
          }

          const debugMessage = debugMatch[1];
          debugText += `${debugMessage}\n`;
          debugText = debugText.substring(0, debugTextMaxLength);

          return;
        }

        // Progress
        const progressMatch = message.match(/^PROGRESS (\d+)$/);
        if (progressMatch !== null) {
          const progress = Number(progressMatch[1]);
          onProgress(progress);
          return;
        }

        // Fail
        if (message === 'FAIL') {
          ended = true;
          return fail();
        }

        // Otherwise it's invalid message
        this.logger.warn(`[${submitId}] Invalid message printed: ${message}`);
        return fail();
      };

      const lineRegex = new RegExp(
        `^{{${submitId.split('-').join('_')} (.+)}}$`,
      );

      lineReader.on('line', (line) => {
        if (resolved) return;

        const match = line.match(lineRegex);

        if (match === null) {
          if (ended) {
            const memoryPrintMatch = line.match(
              /^\s*Maximum resident set size \(kbytes\): (\d+)\s*/,
            );

            if (memoryPrintMatch !== null) {
              memory = Number(memoryPrintMatch[1]) * 1000;
            }

            return;
          }

          // Invalid output
          else {
            return fail();
          }
        }

        onJudgeMessage(match[1]);
      });

      lineReader.on('close', () => {
        if (resolved) return;
        if (succeed) {
          return success(time, memory);
        } else {
          return fail();
        }
      });
    });

    // Attach to container
    const stream = await container.attach({
      stream: true,
      hijack: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });

    // Pipe stdin, stdout
    container.modem.demuxStream(stream, output, output); // Container stdout, stderr => Output stream
    input.pipe(stream); // Input string => Container stdin

    // Start container
    await container.start();

    // Close output stream when program exit
    container
      .wait()
      .then(() => output.end())
      .catch();

    const timeout = setTimeout(timeLimit, {
      type: 'timeout',
    } as const);

    const waitForExit = container
      .wait()
      .then((result) => result.StatusCode as number)
      .catch();

    const result = await Promise.race([
      timeout,
      Promise.all([handleOutput, waitForExit]).then(([result, returnCode]) => ({
        type: 'done' as const,
        ...result,
        returnCode,
      })),
    ]);

    if (debugText.length === debugTextMaxLength) debugText += '...';
    if (debugText.length > 0) this.logger.debug(`[${submitId}] ${debugText}`);

    try {
      await container.kill();
    } catch {}
    try {
      await container.remove();
    } catch {}

    return (
      match(result)
        // Timeout
        .with(
          { type: 'timeout' },
          () =>
            ({
              type: 'FAILED',
              reason: 'TIME_LIMIT_EXCEED',
              debugText,
            }) satisfies JudgeResult,
        )
        // Runtime error
        .with(
          { type: 'done', returnCode: P.not(0) },
          () =>
            ({
              type: 'FAILED',
              reason: 'RUNTIME_ERROR',
              debugText,
            }) satisfies JudgeResult,
        )
        // Success
        .with({ type: 'done', ok: true }, (result) =>
          result.memory <= memoryLimit
            ? ({
                type: 'SUCCESS',
                time: result.time,
                memory: result.memory,
                debugText,
              } satisfies JudgeResult)
            : ({
                type: 'FAILED',
                reason: 'MEMORY_LIMIT_EXCEED',
                debugText,
              } satisfies JudgeResult),
        )
        // Failed
        .with(
          { type: 'done', ok: false },
          () =>
            ({
              type: 'FAILED',
              reason: 'WRONG',
              debugText,
            }) satisfies JudgeResult,
        )
        .exhaustive()
    );
  }
}
