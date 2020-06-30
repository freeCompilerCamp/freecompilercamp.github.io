---
layout: post
title: "Practical for Working with Complex Types"
author: "@vec4"
date: 2020-06-23
categories: practical
tags: [rose, practical]
---

## Check Your Understanding ##
#### Task ####
Implement a ROSE translator that traverses the AST and prints the data type and name for each `const` type-quantified variable. Use a standard pre-order traversal (rather than the Query Library). Run your translator with the following input code:

```c++
const uint64_t foo = 632356;

void bar() {
	const float PI = 3.1415926;
	x = atan2(3 * PI / 2);
}

int main(int argc, char* argv[]) {
	return 0;
}
```

The expected output is below. Please format it exactly as shown.

```
Found a const type-quantified variable: foo (uint64_t)
Found a const type-quantified variable: PI (float)
```

#### Setting Up The Environment ####
Some starter code and a corresponding makefile is available for your usage. The following commands will obtain the skeleton source code for your translator `constTypeModifier` and save it to the `${ROSE_SRC}/quiz-practicals` directory. The corresponding makefile is also saved to `${ROSE_BUILD}/quiz-practicals`, as well as the input source code above as `const_input.cxx` in the same directory.

```.term1
mkdir ${ROSE_BUILD}/quiz-practicals && cd "$_"
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/issue-11/complex-types/quiz-practicals/Makefile
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/issue-11/complex-types/quiz-practicals/const_input.cxx
mkdir ${ROSE_SRC}/quiz-practicals && cd "$_"
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/issue-11/complex-types/quiz-practicals/constTypeModifier.C
```

Make your changes directly to the `constTypeModifier.C` source file. Vim, nano, and emacs are available within the terminal. When you are done, exit the text editor and return to the terminal.

#### Evaluation ####
There are two steps to evaluating your implementation: building the translator itself, and testing it with the input code above. With respect to the latter, your translator will be evaluated with the input code and the resulting output will be compared against the expected output above. If they match, you will have completed and passed the practical; otherwise, you should return to your implementation and make sure it is correct. Please be sure to format your output exactly as the expected output.

To build your translator (without evaluation), run the following command.
```.term1
cd ${ROSE_BUILD}/quiz-practicals
make
```
Your translator should report no errors (it may report warnings, but those can generally be ignored) if implemented correctly and an executable file named `constTypeModifier` should appear in the working directory.

You should now test your implementation with the input code via
```.term1
./constTypeModifier const_input.cxx
```
If you obtain the expected output listed in the problem task description, you are ready for the formal evaluation. To do this, run command
```.term1

```
If no errors are reported, congratulations! You have completed the practical.
