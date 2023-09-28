#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <stdint.h>
#include <sys/time.h>

int judge_steps;
int64_t judge_start_time;

int64_t now() {
  struct timeval time;
  gettimeofday(&time, NULL);
  int64_t s1 = (int64_t)(time.tv_sec) * 1000;
  int64_t s2 = (time.tv_usec / 1000);
  return s1 + s2;
}

void judge_vprint(const char *type, const char *format, va_list ap)
{
    fprintf(stderr, "{{{{SUBMIT_ID}} %s", type);
    if (format != NULL)
    {
        fprintf(stderr, " ");
        vfprintf(stderr, format, ap);
    }
    fprintf(stderr, "}}\n");
}

void judge_print(const char *type, ...)
{
    va_list ap;
    va_start(ap, type);
    judge_vprint(type, va_arg(ap, const char *), ap);
    va_end(ap);
}

/**
 * Print debug message (one line)
 */
void judge_printf(const char *format, ...)
{
    va_list ap;
    va_start(ap, format);
    judge_vprint("DEBUG", format, ap);
    va_end(ap);
}

/**
 * Start judge
 * @param steps Total steps of judge
 */
void judge_start(int steps)
{
    judge_start_time = now();
    judge_steps = steps;
}

/**
 * Report progress
 * @param step Currently processed judge steps
 */
void judge_progress(int steps)
{
    judge_print("PROGRESS", "%d", steps * 100 / judge_steps);
}

/**
 * Report failure (application will exit)
 */
void judge_fail()
{
    judge_print("FAIL", NULL);
    exit(0);
}

/**
 * Report success (application will exit)
 */
void judge_success()
{
    judge_print("SUCCESS", "%ld", now() - judge_start_time);
    exit(0);
}
