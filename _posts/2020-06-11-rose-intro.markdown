---
layout: post
title:  "ROSE - An Introduction"
author: "@vec4"
date: 2020-06-11
categories: beginner
tags: [rose]
---

# Tips:

Code snippets are shown in one of three ways throughout this environment:

1. Code that looks like `this` is sample code snippets that is usually part of
   an explanation.
2. Code that appears in box like the one below can be clicked on and it will
   automatically be typed in to the appropriate terminal window:
   ```.term1
   vim readme.txt
   ```

3. Code appearing in windows like the one below is code that you should type in
   yourself. Usually there will be a unique ID or other bit your need to enter
   which we cannot supply. Items appearing in <> are the pieces you should
   substitute based on the instructions.  
   ```
   Add your name here - <name>
   ```

## Features ##
This tutorial consists of a brief introduction to the ROSE compiler,
its infrastructure and capabilities, and how it can be used. Some simple
examples will be shown using the terminal environment.

---

# A. Overview
The goal of this tutorial is to provide the reader with an introduction to ROSE, what it is used for, and showcase a simple example
using pre-built tools within ROSE. After completing this tutorial, the reader
should have a basic understanding of the purpose of ROSE and be familiar with
the layout of its infrastructure. This will prepare the reader for subsequent
tutorials on specific ROSE components.

# B. The ROSE Compiler
ROSE is an open-source compiler infrastructure used to build source-to-source program
transformation and analysis tools, especially for large-scale applications
written in various languages (C, C++, Fortran, OpenMP, and others). Tools ROSE
is capable of building include those for static and dynamic analysis, program
optimization, arbitrary program transformation, domain-specific optimizations,
complex loop optimizations, performance analysis, and cyber-security. ROSE is
also capable of building tools for binary executables, allowing for the creation
of mixed forms of static and dynamic analysis tools.

The core of ROSE is abstracted from the development of tools, meaning that tool
developers can simply use the existing infrastructure of ROSE for tool creation.
The infrastructure provides a common level of support for source code analysis, such as parsing, common
forms of compiler analysis, common transformations, and code generation; for
binary analysis, tools include disassembly, function boundary detection, and
common forms of analysis. ROSE itself also provides a set of tools to support
user's own forms of analysis and specialized transformations, such as a full
OpenMP compiler built using the ROSE infrastructure.

At its core, ROSE consists of three parts:
1. The frontend, which addresses language specific parsers (and binary
   disassembly in the case of binary support)
2. The midend, which addresses analysis and transformation
3. The backend, which addresses code generation

The **frontend** is arguably the most fundamental component of ROSE. It is
responsible for reading in given source code and/or binaries and generating the
abstract syntax tree (AST) based on this input. The AST forms a graph
representing the structure of the source code and/or binary executable and is
held in memory for optimal performance. The nodes used to define the AST graph
are an intermediate representation (IR); common within compiler research as a
way of representing the structure of software absent syntax details (commas,
semi-colons, whitespace, etc.).

The **midend** provides mechanisms to traverse and manipulate the AST. This is where
transformations are made, as well as optimizations and analyses, such as
loop optimizations and dataflow analysis. Once the AST has been manipulated, it
is passed to the backend.

The **backend** is responsible for code generation based on the modified AST. This
component generates the source code represented by the modified AST and can
optionally pass the final ROSE-generated source code to a vendor's compiler (e.g, gcc) to be compiled.

From these three components and the flow of execution through them, we see that
ROSE is a source-to-source translator tool. Translators are *similar* to
preprocessors but are significantly more sophisticated as they must understand
the source code at a fundamentally deeper level (using a grammar for the whole
language and on the whole source code). Preprocessors, on the other hand, only
understand the source code using a simpler grammar and on a subset of the source
code. It is *loosely* the difference between any language compiler and the C
preprocessor. These translators are useful for many purposes, such as automated
analysis and/or modification of source code, instrumentation, data extraction,
and building domain-specific tools.

# C. Capabilities of ROSE
You should be interested in ROSE if you want to understand or improve any aspect
of your software. ROSE makes it easy to build tools that read and operate on
source code from large scale applications (millions of lines). Whole projects
may be analyzed and even optimized using tools built using ROSE. ROSE itself is
analyzed nightly using ROSE.

Some examples of some tools that have been built with ROSE include
- OpenMP translator
- Array class abstraction organizer
- Source-to-source instrumenter
- Loop analyzer
- Symbolic complexity analyzer
- Inliner and outliner
- Code coverage tools

Many other custom tools, such as optimization tools, documentation generators,
analysis tools, code pattern recognition tools, and security analysis tools are
also capable of being built with ROSE.

# D. Directory Structure
ROSE is already included and built in FreeCompilerCamp terminal environments.
There are three main directories of ROSE:

- `~/build/rose_build`, referenced by environment variable `${ROSE_BUILD}`
- `~/install/rose_install`, referenced by environment variable `${ROSE_PATH}`
- `~/source/rose_src`, referenced by environment variable `${ROSE_SRC}`

The build and install directories differ in that the install directory contains
the specific configuration install of the ROSE core. Most of the examples in
these tutorials will reference components in the build directory.

# E. A Simple Translator Example
The simplest translator is the *identity translator*, which takes some given
source code, goes through the three components of ROSE, and returns the same
source code. It is often use for testing ROSE functionality and as a starting
point for more complicated translators. We will use it as an example here to get a feel for how tools in ROSE are written using the ROSE
infrastructure.

The source code for the identity translator is already available in the terminal
environment and can be viewed by
```.term1
cat ${ROSE_SRC}/tutorial/identityTranslator.C
```

Recall you may simply click on terminal snippets such as the one above to immediately execute the commands in the terminal. You may also use your favorite text editor to open source files (nano, vim, and emacs). Alternatively, see the code below.

```cpp
#include "rose.h"

int main( int argc, char * argv[] ){
    // Initialize and check compatibility. See Rose::initialize
    ROSE_INITIALIZE;

    // Build the AST used by ROSE
    SgProject* project = frontend(argc,argv);
    ROSE_ASSERT (project != NULL);

    // Run internal consistency tests on AST
    AstTests::runAllTests(project);

    // Insert your own manipulation of the AST here...

    // Generate source code from AST and call the vendor's compiler
    return backend(project);
}
```

A few notes about the code:
* The include file `rose.h` is a large header file containing all ROSE includes.
* The line `SgProject* project = frontend(argc,argv);` is what builds the entire AST with a SgProject node serving as root. Both argc and argv are passed to the call of frontend so that any command line arguments passed to the tool are relayed to the compiler.
* The function `AstTests::runAllTests(project);` can be run before or after any transformations to ensure the AST remains valid.
* When transforming code the call `backend(project)` generates source code based on the AST and calls the backend compiler. If you are writing an analysis tool this call is not necessary.

The identity translator tool can be used as a starting point for developing most
tools by adding any transformation or analysis before the call to `backend`.

The makefile for tutorial tools is provided in the terminal
environment. It can be found in ```${ROSE_BUILD}/tutorial```; we can build only
the identity translator with ```make identityTranslator```:
```.term1
cd ${ROSE_BUILD}/tutorial
make identityTranslator
```

To showcase the identity translator, we will run some simple input source code through the translator and view its output. First, we will obtain the sample input code, `sampleInput.cxx`, from GitHub via `wget` and save it into the `${ROSE_BUILD}/tutorial` directory, where our identity translator tool is built. We also show the content of the file in the terminal; please take a moment to breifly look it over.
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-intro/sampleInput.cxx
cat -n sampleInput.cxx
```

To run this sample input code through the identity translator, we simply provide
the filename as a parameter to the built identityTranslator binary:
```.term1
./identityTranslator sampleInput.cxx
```

ROSE will generate an output file named ```rose_sampleInput.cxx```, which is the
resulting source code after being fed through the translator. Since the
translator also called the backend of ROSE, the resulting source code is also
compiled by a vendor compiler (gcc in this case). The resulting ```a.out``` is
the result of this compilation.

We can view the ROSE output source by

```.term1
cat -n rose_sampleInput.cxx
```

Note that the output code is nearly identical to the input source code, save for
whitespace. We expect this, of course, since this is the purpose of the identity
translator.

Feel free to experiment with the identity translator using your own source code as input!

# F. Additional Resources
* The [ROSE Github Wiki](https://github.com/rose-compiler/rose/wiki) contains additional information on ROSE, including how to
build it from source on a personal machine. There are also links to older (no
longer maintained) resources, including several tutorials and a user manual.
* The [ROSE Wikibook](https://en.wikibooks.org/wiki/ROSE_Compiler_Framework)
  is a community-editable documentation for ROSE.
* The [ROSE website](http://rosecompiler.org/) also contains useful information
  about ROSE and its goals.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-06-11-rose-intro.markdown)
