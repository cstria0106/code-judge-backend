import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectAws } from 'aws-sdk-v3-nest';
import { randomUUID } from 'crypto';
import { LRUCache } from 'lru-cache';
import { Readable } from 'stream';
import zlib from 'zlib';

import { FileRepository } from './file.repository';

@Injectable()
export class StorageService implements OnModuleInit {
  private bucket: string;
  private cache: LRUCache<string, Buffer>;

  constructor(
    config: ConfigService,
    @InjectAws(S3Client) private readonly s3: S3Client,
    private readonly files: FileRepository,
  ) {
    this.bucket = config.getOrThrow<string>('AWS_S3_BUCKET');
    this.cache = new LRUCache({
      maxSize: 1024 * 1024 * 512,
      sizeCalculation: (buffer) => buffer.length,
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(
        new ListObjectsCommand({ Bucket: this.bucket, MaxKeys: 1 }),
      );
    } catch (e) {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async create(uploaderId: string, filename: string, keyPrefix?: string) {
    const id = `${keyPrefix ?? ''}${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: id,
    });

    await this.files.createOne({
      id,
      filename,
      uploaderId,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });

    return {
      id,
      uploadUrl,
    };
  }

  async get(id: string) {
    const file = await this.files.findOneOrThrow({
      id,
    });

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: id,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 3600,
    });

    return {
      id: file.id,
      filename: file.filename,
      downloadUrl,
    };
  }

  async download(id: string): Promise<Readable> {
    const cached = this.cache.get(id);
    const buffer =
      cached !== undefined
        ? cached
        : await this.s3
            .send(new GetObjectCommand({ Bucket: this.bucket, Key: id }))
            .then(async (response) => {
              if (response.Body === undefined) {
                throw new NotFoundException();
              }

              if (!(response.Body instanceof Readable)) {
                throw new InternalServerErrorException();
              }

              const chunks = [];
              for await (let chunk of response.Body) {
                chunks.push(chunk);
              }
              return Buffer.concat(chunks);
            });

    this.cache.set(id, buffer);

    return Readable.from(buffer).pipe(zlib.createGunzip());
  }

  async destroy(id: string): Promise<void> {
    const artifact = await this.files.findOneOrThrow({ id });

    await this.files.destroyOne({ id: artifact.id });
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: artifact.id }),
    );
  }
}
