---
layout: post
title: "Loop Optimization"
author: "@vec4"
date: 2020-07-31
categories: intermediate
tags: [rose, loop-optimization, program-transformation]
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

---

## Features ##
Loop optimization refers to a general class of optimizations focused on reducing overhead and increasing speed for loop-based code by making better use of caches. There are many loop transformations - fission, fusion, unrolling, skewing, tiling, etc. Many workloads in high performance computing and scientific computing spend time in loop-based code, resulting in this area becoming a bit of a hot topic.

In this tutorial, we look at how to perform various loop optimizations in ROSE using the `LoopTransformInterface` namespace in a simple example translator. We also look at some example executions.

---

## A. Example Translator ##
Here, we show a simple example translator that shows a pre-defined set of loop optimizations passed as command line arguments, defined below.

```
-ic1 : loop interchange for more reuses
-bk1/2/3 <blocksize> : block outer/inner/all loops
-fs1/2 : single/multi-level loop fusion for more reuses
-cp <copydim> : copy array
-fs0 : loop fission
-splitloop : loop splitting
-unroll [locond] [nvar] <unrollsize> : loop unrolling
-bs <stmtsize> : break up statements in loops
-annot <filename> : Read annotation from a file which defines side effects of functions
-arracc <filename> : Use special function to denote array access (the special function can be replaced with macros after transformation). This option is for circumventing complex subscript expressions for linearized multi-dimensional arrays.
-opt <level=0> : The level of loop optimizations to apply (By default, only the outermost level is optimized).
-ta <int> : Max number of nodes to split for transitive dependence analysis (to limit the overhead of transitive dep. analysis)
-clsize <int> : set cache line size in evaluating spatial locality (affect decisions in applying loop optimizations)
-reuse_dist <int> : set maximum distance of reuse that can exploit cache (used to evaluate temporal locality of loops)
```

Note that this simple translator can perform many different loop optimizations and is well suited for a variety of tasks. We will use a few of them in the examples following.

Let's take a look at the source code for this simple translator.

```.term1
cat -n ${ROSE_SRC}/tutorial/loopOptimization.C
```
<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c linenos %}
// LoopProcessor:
//   Assume no aliasing
//   apply loop opt to the bodies of all function definitions

// =====================================

#include "rose.h"

#include <AstInterface_ROSE.h>
#include "LoopTransformInterface.h"
#include "CommandOptions.h"

using namespace std;

int
main ( int argc,  char * argv[] )
   {
  // Initialize and check compatibility. See Rose::initialize
     ROSE_INITIALIZE;

     vector<string> argvList(argv, argv + argc);
     CmdOptions::GetInstance()->SetOptions(argvList);
     AssumeNoAlias aliasInfo;
     LoopTransformInterface::cmdline_configure(argvList);
     LoopTransformInterface::set_aliasInfo(&aliasInfo);

     SgProject* project = new SgProject(argvList);

  // Loop over the number of files in the project
     int filenum = project->numberOfFiles();
     for (int i = 0; i < filenum; ++i)
        {
          SgSourceFile* file = isSgSourceFile(project->get_fileList()[i]);
          SgGlobal *root = file->get_globalScope();
          SgDeclarationStatementPtrList& declList = root->get_declarations();

       // Loop over the declaration in the global scope of each file
          for (SgDeclarationStatementPtrList::iterator p = declList.begin(); p != declList.end(); ++p)
             {
               SgFunctionDeclaration *func = isSgFunctionDeclaration(*p);
               if (func == NULL)
                    continue;
               SgFunctionDefinition *defn = func->get_definition();
               if (defn == NULL)
                    continue;

               SgBasicBlock *stmts = defn->get_body();
               AstInterfaceImpl faImpl(stmts);

            // This will do as much fusion as possible (finer grained
            // control over loop optimizations uses a different interface).
               LoopTransformInterface::TransformTraverse(faImpl, AstNodePtrImpl(stmts));

            // JJW 10-29-2007 Adjust for iterator invalidation and possible
            // inserted statements
               p = std::find(declList.begin(), declList.end(), func);
               assert (p != declList.end());
             }
        }

  // Generate source code from AST and call the vendor's compiler
     return backend(project);
   }
{% endhighlight %}
</figure>

</details>

The code here is quite contained and simple. Lines 21-25 setup the `LoopTransformInterface` with the command line arguments that were passed to the executable (one or more of the arguments discussed previously).

The bulk of this translator is on lines 37-59, shown below.

<figure class="customlines-container">
{% highlight c %}
// Loop over the declaration in the global scope of each file
   for (SgDeclarationStatementPtrList::iterator p = declList.begin(); p != declList.end(); ++p)
      {
        SgFunctionDeclaration *func = isSgFunctionDeclaration(*p);
        if (func == NULL)
             continue;
        SgFunctionDefinition *defn = func->get_definition();
        if (defn == NULL)
             continue;

        SgBasicBlock *stmts = defn->get_body();
        AstInterfaceImpl faImpl(stmts);

     // This will do as much fusion as possible (finer grained
     // control over loop optimizations uses a different interface).
        LoopTransformInterface::TransformTraverse(faImpl, AstNodePtrImpl(stmts));

     // JJW 10-29-2007 Adjust for iterator invalidation and possible
     // inserted statements
        p = std::find(declList.begin(), declList.end(), func);
        assert (p != declList.end());
      }
 }
{% endhighlight %}
</figure>

For every file processed, we loop over each declaration in the global scope. We ignore any function declarations and function definitions as these are not related to loop transformations. We then obtain the body of the global scope and setup an `AstInterfaceImpl` object that represents the parts of the AST corresponding to those statements to be transformed. The `TransformTraverse()` function is then called from the `LoopTransformInterface` namespace to perform the loop optimization corresponding to the type passed via the command line arguments. This function takes as parameters the `AstInterfaceImpl` object and an `AstNodePtrImpl` object that corresponds to code fragments to be transformed.

Let's compile this tool via the commands below before looking at some example loop transformations performed with the tool.

```.term1
cd ${ROSE_BUILD}/tutorial
make loopOptimization
```

## B. Example Transformations ##
In this section, we take a look at a few example runs using the translator in the previous section.

#### Loop Fission ####
In this example, we want to perform a transformation on the matrix multiply code below. Here, we ignore outer loops via the `-bk1` argument and perform loop fission (loops are broke into multiple loops over the same index) with the `-fs0` argument.

<figure class="lineno-container">
{% highlight c linenos %}
// Example program showing matrix multiply
// (for use with loop optimization tutorial example)

#define N 50

int main()
  {
    int i,j,k;
    double a[N][N], b[N][N], c[N][N];

    for (i = 0; i <= N-1; i+=1)
      {
        for (j = 0; j <= N-1; j+=1)
          {
            for (k = 0; k <= N-1; k+=1)
              {
                c[i][j] = c[i][j] + a[i][k] * b[k][j];
              }
          }
      }
    return 0;
  }
{% endhighlight %}
</figure>

Obtain the code and run the translator on it via the commands below.

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-loop-optimization/matrix-multiply.c
./loopOptimization -bk1 -fs0 matrix-multiply.c
```

We see the output:
```.term1
cat -n rose_matrix-multiply.c
```
<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c linenos %}

int min2(int a0,int a1)
{
  return a0 < a1?a0 : a1;
}
// Example program showing matrix multiply
// (for use with loop optimization tutorial example)
#define N 50

int main()
{
  int i;
  int j;
  int k;
  double a[50][50];
  double b[50][50];
  double c[50][50];
  int _var_0;
  int _var_1;
  for (_var_1 = 0; _var_1 <= 49; _var_1 += 16) {
    for (_var_0 = 0; _var_0 <= 49; _var_0 += 16) {
      for (k = 0; k <= 49; k += 1) {
        for (i = _var_1; i <= min2(49,_var_1 + 15); i += 1) {
          for (j = _var_0; j <= min2(49,_var_0 + 15); j += 1) {
            c[i][j] = c[i][j] + a[i][k] * b[k][j];
          }
        }
      }
    }
  }
  return 0;
}
{% endhighlight %}
</figure>

</details>

Notice that ROSE has performed loop fission by breaking up the inner loop and inserted a `min2()` function to facilitate this.

#### Loop Fusion ####
Here, we look at the opposite of loop fission: loop fusion, whereby we combine multiple loops into one. We use a simple input code:

<figure class="lineno-container">
{% highlight c linenos %}
main() {
  int x[30], i;

    for (i = 1; i <= 10; i += 1) {
      x[2 * i] = x[2 * i + 1] + 2;
    }
    for (i = 1; i <= 10; i += 1) {
      x[2 * i + 3] = x[2 * i] + i;
    }
}
{% endhighlight %}
</figure>

For loop fusion, we use the `-fs2` argument to the translator:

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-loop-optimization/fusion.c
./loopOptimization -fs2 fusion.c
```

We see the output:

```.term1
cat -n rose_fusion.c
```
<details class="code-collapsible">
<summary>Click here to view output code.</summary>

<figure class="lineno-container">
{% highlight c linenos %}
int main()
{
  int x[30];
  int i;
  for (i = 1; i <= 11; i += 1) {
    if (i <= 10) {
      x[2 * i] = x[2 * i + 1] + 2;
    }
     else {
    }
    if (i >= 2) {
      x[2 * (-1 + i) + 3] = x[2 * (-1 + i)] + (-1 + i);
    }
     else {
    }
  }
}
{% endhighlight %}
</figure>

</details>

Here, ROSE has successfully performed loop fusion by combining the two for loops into one, and keept the correctness valid with the insertion of the two conditional statements.

---

## Additional Resources ##
  * This tutorial is based on Chapter 38 of the [ROSE Tutorial](http://rosecompiler.org/uploads/ROSE-Tutorial.pdf). A more sophisticated translator called `LoopProcessor` is discussed there as well. For those more interested in loop transformations in ROSE, we encourage them to take a look at this resource.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-rose-loop-optimization.markdown)
