function parseAmqpUri(uri: string) {
  const match = uri.match(/^\s*(.+):\/\/(.+):(.+)@(.+):(.+)\s*$/);
  if (match === null) {
    throw new Error(`${uri} is not valid amqp connection uri`);
  }

  return {
    protocol: match[1],
    username: match[2],
    password: match[3],
    hostname: match[4],
  };
}
