---
layout: post
title:  "autoPar - Auto Parallization Tool in ROSE"
author: "@ouankou"
date:   2019-07-01
categories: beginner
tags: [rose,openmp,autopar,parallelization]
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

## Features

This is a tool which can automatically insert OpenMP pragmas into input serial C/C++ codes.

---

# A. Overview

The goal of this tutorial is to learn how to use an automatic parallelizaiton tool, autoPar, built using ROSE. autoPar can automatically insert OpenMP directives into input serial C/C++ codes. For input programs with existing OpenMP directives, the tool can also double check the correctness when the right option is turned on.

Directory layout
* The source files are currently located in ```$ROSE_SRC/projects/autoParallelization```.
* A standalone executable program (named ```autoPar``` ) is generated and installed to the installation tree of ROSE (under ```$ROSE_PATH/bin```).
* Test input files are located at ```$ROSE_SRC/projects/autoParallelization/tests```.

Similar to ROSE, autoPar is released under the BSD license.

# B. Building and Installing autoPar

THe ROSE source code is provided in the sandbox. The building of librose has been completed as well. You now need to build and install autoPar by following the steps: 

Enter ```autoPar``` build folder.
```.term1
cd $ROSE_BUILD/projects/autoParallelization
```
Start building.
```.term1
make -j4
```
Install the binaries
```.term1
make install
```

Then the binaries will be installed to ```$ROSE_PATH/bin```.
The tool can be tested by the following command. This step is optional and it can take a while.
```.term1
make check -j4
```

To display command line options:
```.term1
autoPar --help
```

Additional useful ROSE flags:
```
-rose:skipfinalCompileStep // skip invoking the backend compiler to compile the transformed code, this is useful to workaround some bugs
--edg:no_warnings // suppress warnings from the EDG C++ frontend
```

# C. Usage Examples

Testing input files can be found at https://github.com/rose-compiler/rose/tree/master/projects/autoParallelization/tests

The corresponding generated testing output files can be found at: https://github.com/chunhualiao/autoPar-demo

We provide two samples below:

### Without using annotations

Checkout the input:
```.term1
cat $ROSE_SRC/projects/autoParallelization/tests/inner_only.c
```

Conduct auto parallelization:
```.term1
autoPar -c $ROSE_SRC/projects/autoParallelization/tests/inner_only.c
```

Checkout the output:
```.term1
cat ./rose_inner_only.c
```

# References

For more information about this tool, please check
* https://en.wikibooks.org/wiki/ROSE_Compiler_Framework/autoPar
* There is a section in ROSE manual: 12.7 Automatic Parallelization *pdf(http://rosecompiler.org/docs/snapshots/Edited%20ROSE-UserManual%209_10_231.pdf)*. 
