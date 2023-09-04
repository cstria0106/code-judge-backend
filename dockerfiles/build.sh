#!/bin/sh
set -e

docker build --file compiler/gcc.Dockerfile --tag compiler-gcc compiler
docker build --file compiler/jdk.Dockerfile --tag compiler-jdk compiler
docker build --file runtime/binary.Dockerfile --tag runtime-binary runtime
docker build --file runtime/java.Dockerfile --tag runtime-java runtime