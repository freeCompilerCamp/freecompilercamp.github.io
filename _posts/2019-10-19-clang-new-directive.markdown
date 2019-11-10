---
layout: post
title:  "How to add a new OpenMP directive in Clang/LLVM compiler"
author: "@alokmishra.besu"
date:   2019-10-18
categories: beginner
tags: [llvm,clang,openmp,directive]
---

### **Tips:**

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

In this tutorial we will cover how to add a new OpenMP directive in Clang/LLVM compiler. 
The goal of this tutorial is to add a new OpenMP directive -- *`allocate`*. 
This tutorial is intended to give you some insight into the real-world front end used by LLVM/Clang.

An *allocate* directive is an executable directive that allocates memory to a given pointer.

The syntax of *`allocate`* has the following format:
```
#pragma omp allocate(A)
```
Here, A is a pointer defined in the program, and this statement specifies that memory space for the data pointed to by A should be allocated, using malloc internally. 
To make this task simpler, we assume for this task that the amount of memory to be allocated is always *(100\*sizeof(int))*.


---

### Step 1 - Locate and go to clang directory
First, let's enter the `LLVM` source folder to look around. There are a bunch of files and directories there. For now only interested in the Clang sub-project of the LLVM source code. In this tutorials's environment, the Clang project is located at `$LLVM_SRC/tools/clang`. In your machine you should locate the Clang project and switch to that directory.
```.term1
cd $LLVM_SRC/tools/clang
```

### Step 2 - Define the token of new directive
The first thing that we should do is let the compiler identify a new directive, which in this tutorial is `allocate`.

Now let us update the compiler, such that it just identifies the new directive. For this we need to update two files:
1. *OpenMPKinds.def* -- which defines the list of supported OpenMP directives and clauses.
2. *ParseOpenMP.cpp* -- which implements parsing of all OpenMP directives and clauses.

To define the new directive we will modify the file `OpenMPKinds.def`, located in `include/clang/Basic`. 
So open the file using your favorite editor and go to line 237 (or anywhere before `#undef OPENMP_DIRECTIVE` is called).
```.term1
vim include/clang/Basic/OpenMPKinds.def +237
```

Add the following new line after it:
```
OPENMP_DIRECTIVE(allocate)
```

In our current state we are not dealing with any clause associated with allocate, so we do not need to define `OPENMP_ALLOCATE_CLAUSE`.

This way we are able to define the token for the new directive `#pragma omp allocate`.

## Step 3 - Implement parsing
Before parsing the lexer will split the source code into multiple tokens. 
The parser will read these tokens and give a structural representation to them. 
To implement the parsing of this new directive we need to modify the file `ParseOpenMP.cpp`, located in `lib/Parse`. 
Open this file and go to the function `ParseOpenMPDeclarativeOrExecutableDirective`, identify the switch statement (line 997):
```.term1
vim lib/Parse/ParseOpenMP.cpp +997
```

Add a new case for `OMPD_allocate` anyweher inside of the body of the switch statement. 
Here we will print out <span style="color:blue">**ALLOCATE is caught**</span> and then consume the token.
```
  case OMPD_allocate: {
    llvm::errs() <<"ALLOCATE is caught\n";
    ConsumeToken();
    ConsumeAnnotationToken();
    break;
  }
```

That's it for now. Now let us build and test our code.

## Step 4 - Building LLVM and testing code
To build `LLVM` go to the `LLVM_BUILD` directory and run make. 
We are redirecting the standard output of make to /dev/null to have a clean output. 
Warning and error messages will still show up if there are any.

```.term1
cd $LLVM_BUILD && make -j4 install > /dev/null
```

This build step may take a few minutes. 
You might get a couple of warnings about `enumeration value 'OMPD_allocate' not handled in switch`. 
Please ignore these warnings for now; we will handle them later. 
Once the code builds successfully and is installed, its time to test a small program. 
Let us create a new test file:

```.term1
cat <<EOF > allocate.c
int main()
{
#pragma omp allocate
    return 0;
}
EOF
```

Now you have a new test file `allocate.c` which uses the `allocate` directive. 

Build this file using your Clang compiler.

```.term1
clang -fopenmp allocate.c
```

you should get an output `ALLOCATE is caught`. 

<span style="color:green">**Congratulations**</span> you were successfully able to add and identify a new directive to openmp in Clang compiler. Next follow the tutorial -- [Adding an AST Node for new Directive in OpenMP (Clang)](http://www.freecompilercamp.org/clang-ast-node/).
