---
layout: post
title:  "ROSE AST - Traversal"
author: "@chunhualiao"
date:   2019-08-29
categories: beginner
tags: [rose,ast,traversal]
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
This is a tutorial to build your own tool traversing ROSE AST to find things of your interests.

---

# A. Overview
An essential task in compiler development is to walk the AST 
to find nodes of interests, in order to gather information and/or modify
AST in the context of building program analysis and transformation..  
ROSE includes different
sorts of traversal APIs to help this task.

The goal of this tutorial is to learn how to use a visitor pattern traversal API to walk the AST and find for loops in an input program. 

# B. Get the source files and makefile

Get the example ROSE-based analyzer traversing AST to find loops. Rename it to be demo.C:
```.term1
wget https://raw.githubusercontent.com/rose-compiler/rose/develop/tutorial/visitorTraversal.C
mv visitorTraversal.C demo.C
```
We can look into the example analyzer's source code:
```.term1
cat demo.C
```
Essentially, we can see the following content:
```
  4 #include "rose.h"
  5 
  6 class visitorTraversal : public AstSimpleProcessing
  7    {
  8      public:
  9           visitorTraversal();
 10           virtual void visit(SgNode* n);
 11           virtual void atTraversalEnd();
 12    };
 13 
 14 visitorTraversal::visitorTraversal()
 15    {
 16    }
 17 
 18 void visitorTraversal::visit(SgNode* n)
 19    {
 20      if (isSgForStatement(n) != NULL)
 21         {
 22           printf ("Found a for loop ... \n");
 23         }
 24    }
 25 
 26 void visitorTraversal::atTraversalEnd()
 27    {
 28      printf ("Traversal ends here. \n");
 29    }
 30 
 31 int
 32 main ( int argc, char* argv[] )
 33    {
 34   // Initialize and check compatibility. See Rose::initialize
 35      ROSE_INITIALIZE;
 36 
 37      if (SgProject::get_verbose() > 0)
 38           printf ("In visitorTraversal.C: main() \n");
 39 
 40      SgProject* project = frontend(argc,argv);
 41      ROSE_ASSERT (project != NULL);
 42 
 43   // Build the traversal object
 44      visitorTraversal exampleTraversal;
 45 
 46   // Call the traversal function (member function of AstSimpleProcessing)
 47   // starting at the project node of the AST, using a preorder traversal.
 48      exampleTraversal.traverseInputFiles(project,preorder);
 49 
 50      return 0;
 51    }
```
A ROSE-based tool initializes ROSE first (at line 35). Then the frontend() function is called to parse an iput code and generate an AST rooted at `project` of SgProject type (at line 40).

After that, a traversal object is declared at line 44. The object is used to traverse the input files of the project , using a preorder traversal. 

The traversal object is based on a derived `visitorTraversal` class at line 6. This derived class has member functions to define what should happen during construction (line 14), visiting a node (line 18), and the end of the traversal (line 26).  


Now get a sample makefile to build the source file into an executable file:
```.term1
wget https://raw.githubusercontent.com/rose-compiler/rose/develop/tutorial/SampleMakefile
```
We can check the content of the makefile:

```.term1
cat SampleMakefile
```

It should have the following content:
```
...
 25 #If the ROSE bin directory is in your path, rose-config can be found automatically
 26 ifndef ROSE_HOME
 27 ROSE_HOME = $(shell rose-config prefix)
 28 endif
 29 
 30 include $(ROSE_HOME)/lib/rose-config.cfg
 31 
 32 # Standard C++ compiler stuff (see rose-config --help)
 33 ROSE_CXX         = $(shell $(ROSE_HOME)/bin/rose-config ROSE_CXX)
 34 ROSE_CPPFLAGS    = $(shell $(ROSE_HOME)/bin/rose-config ROSE_CPPFLAGS)
 35 ROSE_CXXFLAGS    = $(shell $(ROSE_HOME)/bin/rose-config ROSE_CXXFLAGS)
 36 ROSE_LDFLAGS     = $(shell $(ROSE_HOME)/bin/rose-config ROSE_LDFLAGS)
 37 ROSE_LIBDIRS     = $(shell $(ROSE_HOME)/bin/rose-config ROSE_LIBDIRS)
 38 ROSE_RPATHS      = $(shell $(ROSE_HOME)/bin/rose-config ROSE_RPATHS)
 39 ROSE_LINK_RPATHS = $(shell $(ROSE_HOME)/bin/rose-config ROSE_LINK_RPATHS)
 40 
 41 MOSTLYCLEANFILES =
 42 
 43 ##############################################################################
 44 # Assuming your source code is "demo.C" to build an executable named "demo".
 45 
 46 all: demo
 47 
 48 demo.o: demo.C
 49         $(ROSE_CXX) $(ROSE_CPPFLAGS) $(ROSE_CXXFLAGS) -o $@ -c $^
 50 
 51 demo: demo.o
 52         $(ROSE_CXX) $(ROSE_CXXFLAGS) -o $@ $^ $(ROSE_LDFLAGS) $(ROSE_LINK_RPATHS) -Wl,-rpath=$(ROSE_HOME)/lib
 53 
 54 MOSTLYCLEANFILES += demo demo.o
 55 
 56 ##############################################################################
 57 # Standard boilerplate
 58 
 59 .PHONY: clean
 60 clean:
 61         rm -f $(MOSTLYCLEANFILES)

```
The makefile should be self-explanatory. It uses rose-config in the installation path to set various environment variables for compilers, compilation and linking flags, library path, etc. 


Get an example input code for the analyzer:
```.term1
wget https://raw.githubusercontent.com/rose-compiler/rose/develop/tutorial/inputCode_ExampleTraversals.C
```
The input code has two for-loops at line 20 and 41:
```
  1 
  2 // Templated class declaration used in template parameter example code
  3 template <typename T>
  4 class templateClass
  5    {
  6      public:
  7           int x;
  8           void foo(int);
  9           void foo(double);
 10    };
 11 
 12 // Overloaded functions for testing overloaded function resolution
 13 void foo(int);
 14 
 15 void foo(double)
 16    {
 17      int x = 1;
 18      int y;
 19 
 20      for (int i=0; i < 4; i++)
 21         {
 22           int x;
 23         }
 24 
 25   // Added to allow non-trivial CFG
 26      if (x)
 27         y = 2;
 28      else
 29         y = 3;
 30    }
 31 
 32 int main()
 33    {
 34      foo(42);
 35      foo(3.14159265);
 36 
 37      templateClass<char> instantiatedClass;
 38      instantiatedClass.foo(7);
 39      instantiatedClass.foo(7.0);
 40 
 41      for (int i=0; i < 4; i++)
 42         {
 43           int x;
 44         }
 45 
 46      return 0;
 47    }
```

# C. Build the analyzer using the makefile

Prepare the environment variable used to specify where ROSE is installed.
```.term1
export ROSE_HOME=/home/freecc/install/rose_install
```

Build the analyzer:
```.term1
make -f SampleMakefile
```
There should be an executable file named demo under the current directory:
```.term1
ls demo
```

Finally, run the demo analyzer to process the example input code:

```.term1
./demo -c inputCode_ExampleTraversals.C
```
The analyzer should find two for loops and report the end of the traveral.

```
Found a for loop ...
Found a for loop ...
Traversal ends here.
```

# References

For more information about AST traversal, please check
* http://rosecompiler.org/ROSE_Tutorial/ROSE-Tutorial.pdf Chapter 7
