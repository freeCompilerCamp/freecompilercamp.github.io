---
layout: landing
title:  "Tutorials for ROSE"
date:   2019-11-06
author: "@chunhualiao"
tags: [rose,compiler,landing]
categories:
terms: 0
---
This series of tutorials will help you

  * Get familiar with the key concepts of ROSE

  * Write your own code analyzers

  * Build customized code translators

  * Debug your translators

  * Try out prebuilt ROSE-based tools

## Hands-on Learning
Give ROSE a try with the following tutorials:

### Getting Started with ROSE
[ROSE - An Introduction](/rose-intro)
  * This is a short introduction to ROSE, its features and use cases, and how to use it.

[Getting Familiar with the ROSE AST](/rose-ast)
  * This is a tutorial to use a few tools to visualize AST.

[Traversing the ROSE AST](/rose-ast-traversal)
  * This is a tutorial to build your own tool traversing ROSE AST to find things of your interests.

[Working with Complex Types](/rose-complex-types)
  * This is a tutorial for working with more complex types when traversing the ROSE AST.
  * Check your understanding with the [Practical](/rose-complex-types-practical) for this chapter.
  * Evaluate your understanding with the [Exam](/rose-complex-types-exam) for this chapter.

[Debugging Translators](/rose-debugging)
  * This is a tutorial for debugging ROSE translators.

[Supporting a Clang IR](/add-clang-ir-rose)
  * This is a tutorial for supporting a unknown Clang IR in ROSE.

### Program Transformation and Optimization
[AST Modification - Declarations and Expressions](/rose-ast-modification-part1)
  * This is part one of a two-part tutorial on AST modification for source-to-source transformations.

[AST Modification - Functions and Function Calls](/rose-ast-modification-part2)
  * This is part two of a two-part tutorial on AST modification for source-to-source transformations.

[Inlining Transformations](/rose-inlining)
  * This is a tutorial on using the inline mechanism in ROSE for inlining transformations.

[Outlining Transformations](/rose-outlining)
  * This is a tutorial on using the outline mechanism in ROSE for outlining transformations.

[Loop Optimization](/rose-loop-optimization)
  * This is a tutorial for performing loop optimizations with ROSE.

### Parallelism
[Trying autoPar - Auto Parallelization Tool in ROSE](/rose-autopar)
  * This is a tool which can automatically insert OpenMP pragmas into input serial C/C++ codes.

[Fixing a Bug in OpenMP Implementation](/rose-fix-bug-in-omp)
  * This tutorial is to show how to fix OpenMP implementation bugs in ROSE compiler.

[Working with OpenMP Directives in the ROSE AST]()
    * This is a tutorial for working with OpenMP directives in ROSE.
    * Evaluate your understanding with the two-part exam for this chapter:
        * [Exam Part 1](/rose-map-clause-exam),
        * [Exam Part 2]() - coming soon.

## More Reading: References
  * [ROSE Github Wiki](https://github.com/rose-compiler/rose/wiki)
