---
layout: post
title:  "Libtooling -- Basics of how to write a tool using LibTooling"
author: "@peihunglin"
date:   2020-04-30
categories: beginner
tags: [clang,libtooling,compiler,ast]
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
This document will provide a basic walkthrough of how to write a tool using LibTooling with the following topics:

1. Basis of libtooling
2. Parsing common tools options
3. Creating and running a ClangTool
4. Running the tool on some code

### **A.1 Basis of libtooling** 
Tools built with LibTooling, like Clang Plugins, run `FrontendActions` over code.

In this tutorial, we’ll demonstrate the different ways of running Clang’s `SyntaxOnlyAction`, which runs a quick syntax check, over a bunch of code.

If you ever wanted to run a `FrontendAction` over some sample code, for example to unit test parts of the Clang AST, `runToolOnCode` is what you looked for. An example is in the following:
```
#include "clang/Tooling/Tooling.h"

TEST(runToolOnCode, CanSyntaxCheckCode) {
  // runToolOnCode returns whether the action was correctly run over the
  // given code.
  EXPECT_TRUE(runToolOnCode(std::make_unique<clang::SyntaxOnlyAction>(), "class X {};"));
}
```

For a standalone tool to run clang, it first needs to figure out what command line arguments to use for a specified file. To that end we create a `CompilationDatabase`. There are different ways to create a compilation database, and we need to support all of them depending on command-line options. There’s the `CommonOptionsParser` class that takes the responsibility to parse command-line parameters related to compilation databases and inputs, so that all tools share the implementation.

First, we’ll need to create a new directory for our tool and tell CMake that it exists. As this is not going to be a core clang tool, it will live in the clang-tools-extra repository.

```.term1
cd $LLVM_SRC/clang-tools-extra
mkdir libtoolExample
echo 'add_subdirectory(libtoolExample)' >> CMakeLists.txt
cd libtoolExample
``` 

CMakeLists.txt should have the following contents:

```.term1
cat << EOF > CMakeLists.txt 
set(LLVM_LINK_COMPONENTS support)

add_clang_executable(libtool-example
  libtoolExample.cpp
  )
target_link_libraries(libtool-example
  PRIVATE
  clangTooling
  clangBasic
  clangASTMatchers
  )
EOF
```

### **A.2 Parsing common tools options**
`CompilationDatabase` can be read from a build directory or the command line. Using `CommonOptionsParser` allows for explicit specification of a compile command line, specification of build path using the `-p` command-line option, and automatic location of the compilation database using source files paths.

```.term1
cat << EOF > libtoolExample.cpp
#include "clang/Tooling/CommonOptionsParser.h"
#include "llvm/Support/CommandLine.h"

using namespace clang::tooling;

// Apply a custom category to all command-line options so that they are the
// only ones displayed.
static llvm::cl::OptionCategory MyToolCategory("my-tool options");

int main(int argc, const char **argv) {
  // CommonOptionsParser constructor will parse arguments and create a
  // CompilationDatabase.  In case of error it will terminate the program.
  CommonOptionsParser OptionsParser(argc, argv, MyToolCategory);

  // Use OptionsParser.getCompilations() and OptionsParser.getSourcePathList()
  // to retrieve CompilationDatabase and the list of input file paths.
}
EOF
```
You can compile our new example tool by running ninja from the build directory.

```.term1
cd $LLVM_BUILD
ninja
```
### **A.3 Creating and running a ClangTool**
Once we have a `CompilationDatabase`, we can create a `ClangTool` and run our `FrontendAction` over some code. For example, to run the `SyntaxOnlyAction` over the files “a.cc” and “b.cc” one would write:

```
// A clang tool can run over a number of sources in the same process...
std::vector<std::string> Sources;
Sources.push_back("a.cc");
Sources.push_back("b.cc");

// We hand the CompilationDatabase we created and the sources to run over into
// the tool constructor.
ClangTool Tool(OptionsParser.getCompilations(), Sources);

// The ClangTool needs a new FrontendAction for each translation unit we run
// on.  Thus, it takes a FrontendActionFactory as parameter.  To create a
// FrontendActionFactory from a given FrontendAction type, we call
// newFrontendActionFactory<clang::SyntaxOnlyAction>().
int result = Tool.run(newFrontendActionFactory<clang::SyntaxOnlyAction>().get());
```

Now we combine the two previous steps into our first real tool.

```.term1
cd $LLVM_SRC/clang-tools-extra/libtoolExample
cat << EOF > libtoolExample.cpp
// Declares clang::SyntaxOnlyAction.
#include "clang/Frontend/FrontendActions.h"
#include "clang/Tooling/CommonOptionsParser.h"
#include "clang/Tooling/Tooling.h"
// Declares llvm::cl::extrahelp.
#include "llvm/Support/CommandLine.h"

using namespace clang::tooling;
using namespace llvm;

// Apply a custom category to all command-line options so that they are the
// only ones displayed.
static cl::OptionCategory MyToolCategory("my-tool options");

// CommonOptionsParser declares HelpMessage with a description of the common
// command-line options related to the compilation database and input files.
// It's nice to have this help message in all tools.
static cl::extrahelp CommonHelp(CommonOptionsParser::HelpMessage);

// A help message for this specific tool can be added afterwards.
static cl::extrahelp MoreHelp("\nMore help text...\n");

int main(int argc, const char **argv) {
  CommonOptionsParser OptionsParser(argc, argv, MyToolCategory);
  ClangTool Tool(OptionsParser.getCompilations(),
                 OptionsParser.getSourcePathList());
  return Tool.run(newFrontendActionFactory<clang::SyntaxOnlyAction>().get());
}
EOF
```
Building the new tool from LLVM build tree.
```.term1
cd $LLVM_BUILD
ninja
```
### **A.4 Running the tool on some code**
```.term1
cd $LLVM_SRC
$LLVM_BUILD/bin/libtool-example clang/tools/clang-check/ClangCheck.cpp -- \
clang++ -D__STDC_CONSTANT_MACROS -D__STDC_LIMIT_MACROS \
-Itools/clang/include -I$LLVM_BUILD/include -Iinclude  \
-Itools/clang/lib/Headers -c
```
