---
layout: post
title:  "How to add a new OpenMP directive in Clang/LLVM compiler"
author: "@alokmishra.besu"
date:   2019-06-27
categories: beginner
tags: [llvm,clang,openmp,directive]
---

# Tips:

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

### Features

In this tutorial we will cover how to add a new OpenMP directive in Clang/LLVM compiler. The goal of this tutorial is to add a new OpenMP directive -- metadirective (`#pragma omp metadirective [clause[[,]clause]...]`), defined in OpenMP Specification 5.0, that can specify multiple directive variants of which one may be conditionally selected to replace the metadirective based on the enclosing OpenMP context.

A metadirective is an executable directive that 
* Conditionally resolves to another directive at compile time by selecting from multiple directive variants 
* Based on traits that define an OpenMP condition or context.
* Improve performance portability by adapting OpenMP pragmas and user code at compile time.

The syntax of a metadirective has the following format:
```
#pragma omp metadirective [clause[[,]clause]...]new-line
```
Clause is one of the following
* when(context-selector-specification: [directive-variant])
* default(directive-variant)

The following example showing how a metadirective can faciliate compile-time adapation without using the traditional preprocessing directives. 

```
// Traditional way to enable two versions of OpenMP code using #if-#else. 
// The same code is duplicated multiple times.
int v1[N], v2[N], v3[N];
#if defined(nvptx)     
 #pragma omp target teams distribute parallel loop map(to:v1,v2) map(from:v3)
  for (int i= 0; i< N; i++) 
     v3[i] = v1[i] * v2[i];  
#else 
 #pragma omp target parallel loop map(to:v1,v2) map(from:v3)
  for (int i= 0; i< N; i++) 
     v3[i] = v1[i] * v2[i];  
#endif

```
Using meatadirective, the same code can be written as follows:
```
// metadirective supports runtime adaptation using a single copy of code
int v1[N], v2[N], v3[N];
#pragma omp target map(to:v1,v2) map(from:v3)
  #pragma omp metadirective \
     when(device={arch(nvptx)}: target teams distribute parallel loop)\
     default(target parallel loop)
  for (int i= 0; i< N; i++) 
     v3[i] = v1[i] * v2[i];

```

For more information about metadirective, please consult the OpenMP 5.0 specification.  

---

## Step 1 - Locate and go to clang directory
First, let's enter the `LLVM` source folder to look around. There are a bunch of files and directories there. For now only interested in the Clang sub-project of the LLVM source code. In this tutorials's environment, the Clang project is located at `$LLVM_SRC/tools/clang`. In your machine you should locate the Clang project and switch to that directory.
```.term1
cd $LLVM_SRC/tools/clang
```

## Step 2 - Define the new directive
The first thing that we should do is let the compiler identify a new directive, which in this tutorial is `metadirective`.

Now let us update the compiler, such that it just identifies the new directive. For this we need to update two files:
1. *OpenMPKinds.def* -- which defines the list of supported OpenMP directives and clauses.
2. *ParseOpenMP.cpp* -- which implements parsing of all OpenMP directives and clauses.

To define the new directive we will modify the file `OpenMPKinds.def`, located in `include/clang/Basic`. So open the file using your favorite editor and go to line 237 (or anywhere before `#undef OPENMP_DIRECTIVE_EXT` is called).
```.term1
vim include/clang/Basic/OpenMPKinds.def +237
```

Add the following new line after it:
```
OPENMP_DIRECTIVE_EXT(metadirective, "metadirective")
```

In our current state we are not dealing with any clause associated with metadirective, so we do not need to define `OPENMP_METADIRECTIVE_CLAUSE`. We will learn about adding clause later in the tutorial.

This way we are able to define the new directive `#pragma omp metadirective`.

## Step 3 - Implement parsing
Before parsing the lexer will split the source code into multiple tokens. The parser will read these tokens and give a structural representation to them. To implement the parsing of this new directive we need to modify the file `ParseOpenMP.cpp`, located in `lib/Parse`. Open this file and go to the function `ParseOpenMPDeclarativeOrExecutableDirective`, identify the switch statement (line 997):
```.term1
vim lib/Parse/ParseOpenMP.cpp +997
```

Add a new case for `OMPD_metadirective` anyweher inside of the body of the switch statement. Here we will print out <span style="color:blue">**METADIRECTIVE is caught**</span> and then consume the token.
```
  case OMPD_metadirective: {
    llvm::errs() <<"METADIRECTIVE is caught\n";
    ConsumeToken();
    ConsumeAnnotationToken();
    break;
  }
```

That's it for now. Now let us build and test our code.

## Step 4 - Building LLVM and testing code
To build `LLVM` go to the `LLVM_BUILD` directory and run make. We are redirecting the standard output of make to /dev/null to have a clean output. Warning and error messages will still show up if there are any.

```.term1
cd $LLVM_BUILD && make -j8 install > /dev/null
```

This build step may take a few minutes. You might get a couple of warnings about `enumeration value 'ompd_metadirective' not handled in switch`. Please ignore these warnings for now. we will handle them later. Once the code builds successfully and is installed, its time to test a small program. Let us create a new test file:

```.term1
cat <<EOF > meta.c
int main()
{
#pragma omp metadirective 
    for(int i=0; i<10; i++)
    ;
    return 0;
}
EOF
```

Now you have a new test file `meta.c` which uses the `metadirective` directive. 

Build this file using your Clang compiler.

```.term1
clang -fopenmp meta.c
```

you should get an output `metadirective is caught`. 

<span style="color:green">**Congratulations**</span> you were successfully able to add and identify a new directive to openmp in Clang compiler.
