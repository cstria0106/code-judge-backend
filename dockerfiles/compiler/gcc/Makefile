main: main.o judge.o solution.o
	${CXX} -o main main.o judge.o solution.o

main.o: ${MAIN}
	${CXX} -c ${MAIN} -o main.o ${BUILD_FLAGS}

judge.o: judge.c
	${CXX} -c judge.c -o judge.o ${BUILD_FLAGS}

solution.o: ${SOLUTION}
	${CXX} -c ${SOLUTION} -o solution.o ${BUILD_FLAGS} -Wall

clean:
	rm -f main main.o judge.o solution.o