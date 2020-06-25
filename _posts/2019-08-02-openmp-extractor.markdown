---
layout: post
title:  "Extracting OpenMP Information from Programs using a Clang Plugin"
author: "@gleisonsdm"
date:   2019-08-02
categories: beginner
tags: [openmp,plugin,clang]
image: freecompilercamp/pwc:16.04
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

This is a clang plugin that can parse programs with OpenMP directives and generate Json files containing a description about loops.

---

## A. Overview

This tool is an implementation of an external clang plugin. It can parse the source code and extract information about loops with OpenMP directives into Json files. 

## B. Building the OpenMP Extractor

First, please clone the source code:
```.term1
git clone https://github.com/gleisonsdm/OpenMP-Extractor.git
```

Create ```OpenMP-Extractor``` build folder.
```.term1
mkdir OpenMP-Extractor/lib
```

Enter ```OpenMP-Extractor``` build folder.
```.term1
cd OpenMP-Extractor/lib
```

Create a makefile using cmake.
```.term1
CXX=g++ cmake -DLLVM_DIR=${LLVM_INSTALL}/lib/cmake/llvm $HOME/OpenMP-Extractor/clangPlugin/
```

Then the binaries of this library will be installed to ```$HOME/OpenMP-Extractor/lib```.
```.term1
make -j4
```

## C. Example Usage

We provide an example file for testing this plugin. Feel free to try other programs.
```.term1
cat << EOF > test.c
#include <stdlib.h>
#include <stdio.h>
int main (void)
{
  int sum=0;
  #pragma omp parallel for reduction(+:sum)
  for (int i = 0; i < 100; i++)
  {
    sum += 1;
  }
  printf ("sum = %d\n",sum);
  return 0;
}
EOF
```

Run OpenMP Extractor to run the plugin, you should load the library to run the analysis on clang.
To send flags to clang, is necessary to use "-Xclang" before each argument.
 - -load: Necessary to load libraries on clang.
 - $HOME/OpenMP-Extractor/lib/ompextractor/libCLANGOMPExtractor.so: This is the library containing the plugin.
 - -add-plugin: Flag to add a plugin to clang.
 - -extract-omp: This flag asks clang to run the plugin.
 - -fopenmp: Turn on OpenMP support in clang's frontend.
 - -g: Flag to provide debug information about the source file.
 - -O0: Disable optimizations from clang.
 - -c: create an object file only
 - -fsyntax-only : Prevents the compiler to write an object file. We use this avoid the the creation of an intermediate file, as it is not necessary.
 
```.term1
clang -Xclang -load -Xclang $HOME/OpenMP-Extractor/lib/ompextractor/libCLANGOMPExtractor.so -Xclang -add-plugin -Xclang -extract-omp -fopenmp -g -O0 -c -fsyntax-only test.c
```

Checkout if the Json file was created:
```.term1
ls 
```

Checkout the output:
```.term1
cat test.c.json
```

In the end, the Json file stores loop information extracted by Clang/LLVM.

## D. Extending the Plugin

#### Changing the Plugin

First, let's open the plugin source file. The plugin was build in one for simplicity.
```.term1
vim $HOME/OpenMP-Extractor/clangPlugin/ompextractor/ompextractor.cpp
```

Then, modify the code to recognize the new directives or clauses. This tutorial will show how to add suport to the ```num_threads``` clause. To modify the file, go to the line 357 (or before the comment "/*Final or If clauses are marked as multiversioned.*/" in the function "ClassifyClause") and insert the following code:
```cpp
      /*NumThreads clause*/
      if (OMPNumThreadsClause *OMPCc = dyn_cast<OMPNumThreadsClause>(clause)) {
        clauseType["num_threads"] = getStrForStmt(OMPCc->getNumThreads());
      }

```


The next step is to modify the Json builder to write out the information about this new clause. Please, go to the line 480 (or before line with ```currFile.labels += "\"body\":[" + snippet + "]\n";``` in the function "CreateLoopDirectiveNode") and insert the code as described below.
```cpp
currFile.labels += "\"num threads\":\"" + ((clauseType.count("num_threads") > 0) ? (clauseType["num_threads"]) : "") + "\",\n";
```

The last step is to generate similar attribute for loops without openmp directives associated on it. To do that, please, go to the line 164 (or before line with ```currFile.labels += "\"body\":[" + snippet + "]\n";``` in the function "CreateLoopNode") and insert the following code:
```cpp
currFile.labels += "\"num threads\":\"\",\n";
```  

Now, it is done. Just close the file typing ":wq", then type enter.

#### Testing the New Feature

First, let's create the example file. We can use the following source file.
```.term1
cat << EOF > test.c
#include <stdlib.h>
#include <stdio.h>

int main() {
  int i, sum = 0;
  #pragma omp parallel for reduction(+:sum) num_threads(5)
  for (int i = 0; i < 100; i++) {
    sum += 1;
  }

  for (int i = 0; i < 100; i++) {
    sum += 1;
  }

  printf ("sum = %d\n",sum);
  return 0;
}
EOF
```

Rebuild the binaries of this library within ```OpenMP-Extractor/lib```.
```.term1
make -j4
```
To run the example, type the following command line: 
```.term1
clang -Xclang -load -Xclang $HOME/OpenMP-Extractor/lib/ompextractor/libCLANGOMPExtractor.so -Xclang -add-plugin -Xclang -extract-omp -fopenmp -g -O0 -c -fsyntax-only test.c
```

Checkout if the Json file was created:
```.term1
ls
```

The last step is check the output:
```.term1
cat test.c.json
```
You can see the num_threads(5) is recognized and encoded into the json file as follows:
```
25 "num threads":"5",
```
Well done, you got it. 
