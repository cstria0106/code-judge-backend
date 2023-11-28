import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class Judge {
    private int steps;
    private long startTime;

    public void start(int steps) {
        this.steps = steps;
        startTime = System.currentTimeMillis();
    }

    public void progress(int steps) {
        print("PROGRESS", "%d", steps * 100 / this.steps);
    }

    public void fail() {
        print("FAIL");
        System.exit(0);
    }

    public void success() {
        print("SUCCESS", "%d", System.currentTimeMillis() - startTime);
    }

    public void printf(String format, Object... args) {
        print("DEBUG", format, args);
    }

    private void print(String type) {
        System.out.printf("{{{{SUBMIT_ID}} %s}}\n", type);
    }

    private void print(String type, String format, Object... args) {
        System.out.printf("{{{{SUBMIT_ID}} %s %s}}\n", type, String.format(format, args));
    }

    public static class Reader {
        InputStream in;

        public Reader() {
            this(System.in);
        }

        public Reader(InputStream in) {
            this.in = in;
        }

        private ByteBuffer read(int len) throws IOException {
            return ByteBuffer.wrap(in.readNBytes(len)).order(ByteOrder.LITTLE_ENDIAN);
        }

        public byte readByte() throws IOException {
            int read = in.read();
            if (read < 0) throw new IOException("Required array size too large");
            return (byte) read;
        }

        public short readShort() throws IOException {
            return read(2).getShort();
        }

        public int readInt() throws IOException {
            return read(4).getInt();
        }

        public long readLong() throws IOException {
            return read(8).getLong();
        }

        public byte[] readNBytes(int n) throws IOException {
            return in.readNBytes(n);
        }

        public short[] readNShorts(int n) throws IOException {
            return read(n * 2).asShortBuffer().array();
        }

        public int[] readNInts(int n) throws IOException {
            return read(n * 4).asIntBuffer().array();
        }

        public long[] readNLongs(int n) throws IOException {
            return read(n * 8).asLongBuffer().array();
        }
    }
}
