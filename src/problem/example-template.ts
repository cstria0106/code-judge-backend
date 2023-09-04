import { Templates } from './template';

export const exampleTemplate = {
  judge: {
    C: `// Fibonacci example

long long int fibonacci(int n);

#include <stdio.h>

#include "judge.h"

int main(void) {
  int count;
  fread(&count, sizeof(count), 1, stdin);

  int inputs[100];
  long long int outputs[100];

  for(int i = 0; i < count; i++) {
    fread(&inputs[i], sizeof(inputs[i]), 1, stdin);
    fread(&outputs[i], sizeof(outputs[i]), 1, stdin);
  }

  judge_start(count);

  for (int i = 0; i < count; i++) {
    int input = inputs[i];
    long long int expected = outputs[i];
    long long int result = fibonacci(input);

    judge_progress(i); 

    if (result != expected) {
      judge_fail();
    }
  }

  judge_success();
}`,
    CPP: `long long int fibonacci(int n);

#include "judge.h"

int main() {
  // Write judge code here
}
`,
    JAVA: `import java.io.IOException;

public class Main {
    public static void main(String[] args) throws IOException {
        var judge = new Judge();
        var reader = new Judge.Reader();
        var count = reader.readInt();

        var inputs = new int[count];
        var outputs = new long[count];

        for (int i = 0; i < count; i++) {
            inputs[i] = reader.readInt();
            outputs[i] = reader.readLong();
        }

        judge.start(count);

        for (int i = 0; i < count; i++) {
            var input = inputs[i];
            var expected = outputs[i];
            var result = Solution.fibonacci(input);

            judge.progress(i);

            if (result != expected) {
                judge.fail();
            }
        }

        judge.success();
    }
}
`,
  },
  solution: {
    C: `long long int fibonacci(int n) {
  // Write your code here
  return 0;
}
`,
    CPP: `using namespace std;

long long fibonacci(int n) {
  // Write your code here
  return 0;
}
`,
    JAVA: `public class Solution {
  public static long fibonacci(int n) {
    // Write your code here
    return 0;
  }
}`,
  },
} as const satisfies Templates;
