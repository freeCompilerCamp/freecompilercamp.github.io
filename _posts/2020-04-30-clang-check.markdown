---
layout: post
title:  "ClangCheck -- Basics of AST error checking"
author: "@peihunglin"
date:   2020-04-30
categories: beginner
tags: [clang,preprocessor,compiler,ast]
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
This is a short introduction to the basics of ClangCheck tool. 

### **clang-check**
[ClangCheck](https://clang.llvm.org/docs/ClangCheck.html) is a small wrapper around LibTooling which can be used to do basic error checking and AST dumping.

The available functions and options for clang-check can be found by the help option:
```.term1
clang-check --help
```

Let us try the features with the hello world program in C.
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

### **A.1 --ast-dump/--ast-print**
clang-check can be used to dump out the AST.
```.term1
clang-check --ast-dump hello_world.c --
```
The ‘–-’ at the end is important as it prevents clang-check from searching for a compilation database. 

Or clang-check can pretty-print the AST.
```.term1
clang-check --ast-print hello_world.c --
```

### **A.2 --ast-list**
clang-check can Build ASTs and print the list of declaration node qualified names.
```.term1
clang-check --ast-list hello_world.c --
```

### **A.3 --ast-dump-filter**
Use with -ast-dump or -ast-print to dump/print only AST declaration nodes having a certain substring in a qualified name. Use -ast-list to list all filterable declaration node names.

We can dump out only the main function of the Hello World program.
```.term1
clang-check --ast-dump --ast-dump-filter=main hello_world.c --
```

We can use --ast-list to find a specific funciton name. Then use --ast-dump-filter to find out the AST of this funciton.

```.term1
clang-check --ast-list hello_world.c -- | grep printf
```
```.term1
clang-check --ast-dump --ast-dump-filter=fprintf hello_world.c --
```
