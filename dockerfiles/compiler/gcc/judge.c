#include <stdio.h>
#include <time.h>
#include <stdlib.h>
#include <stdarg.h>

int judge_steps;
time_t judge_start_time;

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
    judge_start_time = time(NULL);
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
    judge_print("SUCCESS", "%d", (int)(difftime(time(NULL), judge_start_time) * 1000));
    exit(0);
}
