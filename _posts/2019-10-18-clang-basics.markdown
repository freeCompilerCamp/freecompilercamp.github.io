---
layout: post
title:  "Clang -- Basics of compilation"
author: "@alokmishra.besu"
date:   2019-10-18
categories: beginner
tags: [clang,preprocessor,compiler,ast,traversal,lowering]
---

## **Tips:**

Code snippets are shown in one of three ways throughout this environment:

1. Code that looks like `this` is sample code snippets that is usually part of an explanation.
2. Code that appears in box like the one below can be clicked on and it will automatically be typed in to the appropriate terminal window:
```.term1
vim readme.txt
```

3. Code appearing in windows like the one below is code that you should type in yourself. Usually there will be a unique ID or other bit your need to enter which we cannot supply. Items appearing in <> are the pieces you should substitute based on the instructions.
```
Add your name here - <name>
```

## **Features**
This is a short introduction to the basics of compilation using Clang.

---

## **A. Stages of compilation**
The Clang project provides a language front-end and tooling infrastructure for languages in the C language family (C, C++, Objective C/C++, OpenCL, CUDA, and RenderScript) for the [LLVM](http://www.llvm.org) project. 
But what happens when we try to build a program? Any C compiler can understand the process involved in the following 4 stages:
1. Preprocessing
2. Compiling
3. Assembling
4. Linking

At the end of these 4 stages we should have a single executable file. Given below are the description of these 4 stages that happens using Clang compiler, regardless of the Operating System.

### **A.1 Preprocessor**
This is the first pass of any C compilation. This stage includes:
1. Removal of Comments
2. Expansion of Macros
3. Expansion of the included files.
4. Conditional compilation

In clang we an view the output of a preprocessor by issuing the command
```
clang -E <input C file>
```
The preprocessed output is stored in the &lt;c-file>.i.

Let us try it out.
First write out the most famous hello world program in C.
```.term1
cat << EOF > hello_world.c
#include <stdio.h>

#define STR "Hello World"

/* Multi-line Comment - 
 * Starting main function here
 */
int main()
{
  // Printing Hello World
  printf("%s\n", STR);
  return 0;
}
EOF
```

Now let us see what the clang preprocessor does to this program. 
To get an out put of the preprocessor we use the `-E` option.
```.term1
clang -E hello_world.c > hello_world.i
```

Now view the file using vi
```.term1
vi hello_world.i
```

There must be over 700+ lines in this file. 
This is because the preprocessor expanded the header file stdio.h, expanded the macro (`#define STR`) statement and stripped off the comments. 
The new main function can be found towards the end of the file.

### **A.2 Compiler**
This is the second pass of a C Compilation. 
It takes the output of the preprocessor and the source code, and generates assembler source code.
Clang generates the LLVM IR as an intermediate representation. 

A lots of process happen during this pass.
Clang takes in the pre-processed input and splits in into different token.
Each word in the given input file represents a token.
Clang has a [`TokenKind`](https://clang.llvm.org/doxygen/TokenKinds_8h.html) database, which includes normal tokens like *`tok::ampamp`* (corresponding to the && token) as well as keywords for various languages.

For instance, in our example hello_world program *`tok::l_paren`, `tok::r_paren`, `tok::l_brace`* or *`tok::r_brace`* are punctuators, *`tok::comment`* is a comment, *`tok::int`* or *`tok::return`* are keywords, while *`main`* or *`printf`* are identifiers, and *`"Hello World"`* is a string literal.
If any token does not match a clang::TokenKind, then Clang generates an error.
To run syntax analysis on the file we can use the option `-fsyntax-only`.
```.term1
clang -fsyntax-only hello_world.c
```

Once tokenized it parses the code to create an Abstract Syntax Tree (AST).
<p style="text-align: center;">
<img src="/images/code-to-ast.png" height="135"/> 
<br>
<b>A Sample C Code converted to AST</b>
</p>

To view the AST we can use the option `-ast-dump`.
```.term1
clang -cc1 -ast-dump hello_world.c
```
Here the `-cc1` argument indicates the compiler front-end, and not the driver, should be run. Hence the file is not linked further.

Then it lowers the AST into an unoptimized LLVM IR.
<p style="text-align: center;">
<img src="/images/ast-to-llvmir.png" height="135"/> 
<br>
<b>A Sample AST converted to LLVM IR</b>
</p>

To generate the LLVM-IR we use the option `-S -emit-llvm`
```.term1
clang -S -emit-llvm hello_world.c
```

This will generate a file named `hello_world.ll`. 
This IR is in *Single Static Assignment ([SSA](https://wiki.aalto.fi/display/t1065450/LLVM+SSA))* format.
View the file as
```.term1
vi hello_world.ll
```

Most of the optimizations happen next in this pass of compilation.
To run an optimization we can use the `opt` command.
Suppose we want to run an optimization `-print-function` on the generated LLVM IR. We will run the command as follows:
```.term1
opt -print-function < hello_world.ll
```

### **A.3 Assembler**
Assembly is the third pass of compilation. 
It takes the assembly source code and produces an assembly listing with offsets. 
The assembler output is stored in an object file.
This file contain machine level instructions. 
At this stage, only existing code is converted into machine language, the function calls like `printf` are not resolved.

In LLVM the llc command compiles LLVM source inputs into assembly language for a specified architecture.
```.term1
llc hello_world.ll -march=x86-64 -o hello_world.s
```
This command will produce an assembly for the x86 64-bit architecture.

Similarily if we want to directly generate the object file using clang we will use the `-c` option
```.term1
clang hello_world.c -c -o hello_world.o
```

### **A.4 Linker**
The assembly language output can then be passed through a native assembler and linker to generate a native executable.
In this pass, it takes one or more object files or libraries as input and combines them to produce a single (usually executable) file. 
In doing so, it resolves references to external symbols, assigns final addresses to procedures/functions and variables, and revises code and data to reflect new addresses (a process called relocation).
In Clang we can link different libraries with the assembled code using the `-L` option.

```.term1
clang hello_world.s -Wall -o hello_world
```

We can test our file by running the executable
```.term1
./hello_world
```

<span style="color:green">**Congratulations**</span> you have successfully completed the Clang basics of compilation tutorial. 
Now you can start with the next step of modifying the Clang compiler.
The first tutorial to follow in that is - [Adding a New Directive in OpenMP (Clang)](http://www.freecompilercamp.org/new-directive-llvm).
