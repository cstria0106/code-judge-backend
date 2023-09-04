export async function streamToString(
  stream: NodeJS.ReadableStream,
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  stream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  await new Promise((resolve) => stream.on('end', resolve));

  return Buffer.concat(chunks);
}
