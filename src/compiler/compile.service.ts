import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import MemoryStream from 'memorystream';
import { mkdirp } from 'mkdirp';
import PQueue from 'p-queue-compat';
import path from 'path';
import replaceStream from 'replacestream';
import tar from 'tar';
import { setTimeout } from 'timers/promises';
import { match } from 'ts-pattern';
import typia from 'typia';

import { languages } from '../language/languages';
import { Language } from '../problem/template';
import { streamToString as streamToBuffer } from '../util/stream-to-buffer';
import { CompileResult } from './result';

@Injectable()
export class CompilerService {
  private readonly docker: Docker;
  private readonly queue: PQueue;

  private readonly logger: Logger = new Logger(CompilerService.name);

  private readonly memoryLimit: number | undefined;
  private readonly cpuCount: number | undefined;

  constructor(config: ConfigService) {
    this.docker = new Docker({ Promise: Promise });
    this.queue = new PQueue({ concurrency: 1 });

    const memoryLimitConfig = typia.assert(
      config.get<`${number}` | undefined>('COMPILER_MEMORY_LIMIT'),
    );
    this.memoryLimit =
      memoryLimitConfig !== undefined ? Number(memoryLimitConfig) : undefined;

    const cpuCountConfig = typia.assert(
      config.get<`${number}` | undefined>('COMPILER_CPU_COUNT'),
    );
    this.cpuCount =
      cpuCountConfig !== undefined ? Number(cpuCountConfig) : undefined;
  }

  enqueue(
    submitId: string,
    language: Language,
    judgeCode: string,
    solutionCode: string,
    onStarted: () => void,
    onComplete: (result: CompileResult) => void,
    onError: (e: any) => void,
  ) {
    this.queue.add(async () => {
      onStarted();
      let result: CompileResult;
      try {
        result = await this.compile(
          submitId,
          language,
          judgeCode,
          solutionCode,
        );
      } catch (e) {
        this.logger.error(e);
        onError(e);
        return;
      }

      onComplete(result);
    });
  }

  private async compile(
    submitId: string,
    language: Language,
    judgeCode: string,
    solutionCode: string,
  ): Promise<CompileResult> {
    const lang = languages[language];

    // Create container
    const container = await this.docker.createContainer({
      Image: lang.compiler.image,
      Cmd: lang.compiler.command.slice(),
      WorkingDir: '/app',
      NetworkDisabled: true,
      HostConfig: {
        Memory: this.memoryLimit,
        CpuCount: this.cpuCount,
      },
      Env: lang.compiler.environments
        ? Object.entries(lang.compiler.environments).map(
            ([k, v]) => `${k}=${v}`,
          )
        : undefined,
      Tty: false,
      AttachStderr: true,
    });

    // Resolve tmp
    const tmp = path.resolve('./.tmp', submitId);
    await mkdirp(tmp);

    // Extract container files
    await container
      .getArchive({
        path: '/app',
      })
      .then(
        (stream) =>
          new Promise<void>((resolve) =>
            stream.pipe(tar.x({ strip: 1, C: tmp }).on('finish', resolve)),
          ),
      );

    let files: string[] = [];

    const removeFile = (target: string) => {
      files = files.filter((file) => file !== target);
      return fs.rm(path.resolve(tmp, target));
    };

    const addFile = (target: string, data: string | Buffer) => {
      if (!files.includes(target)) files.push(target);
      return fs.writeFile(path.resolve(tmp, target), data);
    };

    // Write codes
    addFile(lang.judgeCodeName, judgeCode);
    addFile(lang.solutionCodeName, solutionCode);

    const replaceString = (s: string, from: string, to: string) =>
      s.split(from).join(to);

    const applyVariables = (s: string) =>
      replaceString(replaceString(s, '{{SUBMIT_ID}}', submitId), '-', '_');

    // Transform
    if (lang.compiler.transforms) {
      const transformTargets = async (
        targets: readonly string[],
        transform: (data: string) => string,
      ) => {
        await Promise.all(
          targets.map((target) =>
            fs
              .readFile(path.resolve(tmp, target), 'utf-8')
              .then(transform)
              .then((transformed) => addFile(target, transformed)),
          ),
        );
      };

      const renameFile = async (target: string, to: string) => {
        await fs
          .readFile(path.resolve(tmp, target))
          .then((buffer) => addFile(applyVariables(to), buffer))
          .then(() => removeFile(target));
      };

      for (const transform of lang.compiler.transforms) {
        if (transform.type === 'replace_string') {
          await transformTargets(transform.targets, (s) =>
            replaceString(s, transform.from, applyVariables(transform.to)),
          );
        } else if (transform.type === 'rename_file') {
          await renameFile(transform.target, transform.to);
        }
      }
    }

    // Save to container
    await container.putArchive(tar.c({ C: tmp }, files), {
      path: '/app',
    });

    // Attach and get compiler message
    let compilerMessage = '';
    const output = new MemoryStream();
    output.on('data', (chunk) => (compilerMessage += chunk.toString()));

    const stream = await container.attach({
      stream: true,
      stderr: true,
    });

    container.modem.demuxStream(stream, undefined, output); // Container stderr => Output stream

    // Finally start container and get result
    await container.start();

    const result: { StatusCode: number } = await container.wait();

    if (result.StatusCode !== 0) {
      return { type: 'FAILED', message: compilerMessage };
    }

    const buildFiles = lang.buildFiles.map(applyVariables);

    // Download build files
    await container
      .getArchive({ path: '/app' })
      .then(
        (stream) =>
          new Promise<void>((resolve) =>
            stream.pipe(tar.x({ strip: 1, C: tmp }).on('finish', resolve)),
          ),
      );

    await container.remove();

    return {
      type: 'SUCCESS',
      files: Object.fromEntries(
        buildFiles.map((file) => [file, path.resolve(tmp, file)]),
      ),
    };
  }
}
