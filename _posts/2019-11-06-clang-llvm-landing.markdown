---
layout: landing
title:  "Tutorials for Clang/LLVM"
date:   2019-11-06
author: "@chunhualiao"
tags: [clang,llvm,compiler,landing]
categories:
terms: 0
---
This series of tutorials will help you
  
  * Get familiar with the key concepts of clang/llvm

  * Write your own code analyzers

  * Build customized code translators

  * Debug your translators
  
  * Try out prebuilt clang/llvm-based tools

## Hands-on Learning
Give Clang/LLVM a try with the following tutorials:

### Clang Related
[Clang -- An Introduction](/clang-intro) 
  * This is a short introduction on what is clang and how it can be used.

[Clang -- Basics of compilation](/clang-basics)
  * This is a short introduction to the basics of compilation using Clang.

[ClangCheck -- Basics of AST error checking](/clang-check)
  * This is a short introduction to the basics of ClangCheck tool. 

[Libtooling -- a library to support writing standalone tools based on Clang](/libtooling)
  * This presents a basic walkthrough of how to write a tool using LibTooling.

[Clang -- Basics of AST manipulation](/clang-AST-basics)
  * This is a short introduction to the basics of Clang traversal.

[Clang Plugin Example](/clang-plugin)
  * This is a tutorial about how to write a short plugin in Clang which modify the source code as required.

### OpenMP Related

[Building OpenMP Support in LLVM](/llvm-openmp-build)
  * In this tutorial we cover how to build Clang/LLVM and enable OpenMP support in it.

[Extracting OpenMP Information from Programs using a Clang Plugin](/openmp-extractor)
  * This is a clang plugin that can parse programs with OpenMP directives and generate Json files containing a description about loops.

[Adding a New Directive in OpenMP](/clang-new-directive)
  * In this tutorial we will cover how to add a token for a new OpenMP directive in Clang/LLVM compiler.

[Adding an AST Node for new Directive in OpenMP](/clang-ast-node)
  * In this tutorial we will cover how to add an AST Node for the new OpenMP directive in Clang/LLVM compiler.

[Identifying a Clause of new Directive in OpenMP](/clang-clause) 
  * In this tutorial we will cover how to identify and add a clause for the new OpenMP directive in Clang/LLVM compiler.

### LLVM Related

[Getting Familar with LLVM IR](/llvm-ir)
  *  In this tutorial we will explain how to understand LLVM IR using a simplest C program as an example.

[Writing an LLVM Pass](/llvm-pass)
  *  In this tutorial we will cover how to construct a pass, everything from setting up the code, to compiling, loading, and executing it. This pass only traverse the LLVM IR and extracts information from it. 

[Modifying LLVM IR using an LLVM Pass](/llvm-ir-mod)
  *  In this tutorial we will show how to modify/change LLVM IR, using a LLVM pass to replace any binary operation with a multiply operation.

[Creating a Module with a Function using IRBuilder](/llvm-ir-func1)
  *  In this tutorial we will show how to create a module with a function with a few statements, using IRBuilder.


## More Reading: References
  * [LLVM Official Website](https://www.llvm.org/)
  
Source file for this pape: [Link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-11-06-clang-llvm-landing.markdown)
