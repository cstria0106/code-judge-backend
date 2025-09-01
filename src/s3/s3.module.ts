import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsSdkModule } from 'aws-sdk-v3-nest';

@Global()
@Module({
  imports: [
    AwsSdkModule.registerAsync({
      isGlobal: true,
      clientType: S3Client,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const endpoint = config.get<string>('AWS_ENDPOINT');
        const region = config.get<string>('AWS_REGION', 'ap-northeast-2');
        const id = config.getOrThrow<string>('AWS_ACCESS_KEY_ID');
        const secret = config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY');
        return new S3Client({
          endpoint,
          region,
          credentials: {
            accessKeyId: id,
            secretAccessKey: secret,
          },
        });
      },
    }),
  ],
})
export class S3Module {}
