---
layout: post
title:  "Fix a bug in ROSE's OpenMP Implementation"
author: "@ouankou"
date:   2019-07-26
categories: beginner
tags: [rose,openmp,lowering,parallelization]
image: freecompilercamp/pwc:rose-bug
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

This tutorial is to show how to fix OpenMP implementation bugs in ROSE compiler.

---

## A. Overview

![OpenMP Lowering by ROSE, using PI as an example](/images/rose-omp-lowering-pi.png)

When ROSE transforms (also called lowers) the ```omp parallel for``` directive, there are several steps involved:
* The compiler outlines the parallel region into an outlined function (usually named OUT__X_xxx(...)).
* Inside the outlined function, each thread will execute a different portion of the ```for``` loop. The beginning, ending index and step of ```for``` loop has to be calculated carefully to enforce correct result. This calculation is performed by a runtime library call doing loop scheduling (e.g. XOMP_loop_default(...)). ROSE inserts a call to this loop scheduling function right before the loop to obtain the right index range and step (or stride). 
* The compiler finally replaces the original parallel region with another runtime call (named XOMP_parallel_start(..)) which accepts a function pointer to the outlined function. This runtime function will fork multiple threads to execute the generated outlined function. 

When there are bugs in either OpenMP lowering or runtime loop scheduler or both, the calculation may result in wrong results. 

Plese execute the following code to check out an old version of ROSE with a bug, which was reported by a user: 

```.term1
cd $ROSE_SRC &&
git checkout -b v0.9.11.138
```

## B. Reproduce the Bug

The input program demonstrating the bug is a classic PI calculation program. An earlier version of ROSE compiles it and generates an executable. But the result is not the expected value (3.141596). Sometimes the execution even crashes. 

First, we try to reproduce the bugs:.

#### Prepare the input OpenMP program

```.term1
cd $EXAMPLE_DIR &&
cat <<EOF > bug_parallel_for_in_rose.c
#include <omp.h>
#include <stdio.h>
int num_steps = 10000;
int main()
{
    double x=0;
    double sum = 0.0, pi;
    int i;
    double  step = 1.0/(double) num_steps;
    #pragma omp parallel for private(i,x) reduction(+:sum) schedule(static)
    for (i=0; i<num_steps; i=i+1)
    {
        x=(i+0.5)*step;
        sum = sum + 4.0/(1.0+x*x);
    }
    pi=step*sum;
    printf("%f\n", pi);
} 
EOF
```

#### Generate the binary executable 

```.term1
rose-compiler -rose:openmp:lowering -lxomp -lomp bug_parallel_for_in_rose.c
```

#### Show the incorrect output

```.term1
./a.out
```
The execution may crash by triggering a non-negative stride assertion in a runtime function. Or it may generate an incorrect PI value rather than ```3.141593```.  Something is obviously wrong in the compilation.

## C. Analyze the Bug

ROSE is a source-to-source compiler so it conveniently outputs a transformed source code (with a prefix of `rose_`) as part of the OpenMP lowering translation step.
Let's see the generated source code.

```.term1
vim rose_bug_parallel_for_in_rose.c +46
```
We should see code like the following:

```
 35 static void OUT__1__4219__(void *__out_argv)
 36 {
 37   double *sum = (double *)(((struct OUT__1__4219___data *)__out_argv) -> sum_p);
 38   double *step = (double *)(((struct OUT__1__4219___data *)__out_argv) -> step_p);
 39   double _p_x;
 40   double _p_sum;
 41   _p_sum = 0;
 42   unsigned int _p_i;
 43   long p_index_;
 44   long p_lower_;
 45   long p_upper_;
 46   XOMP_loop_default(0,num_steps - 1,_p_i + 1, &p_lower_,&p_upper_);
 47   for (p_index_ = p_lower_; ((long )p_index_) <= p_upper_; p_index_ = p_index_ + 1) {
 48     _p_x = (p_index_ + 0.5) *  *step;
 49     _p_sum = _p_sum + 4.0 / (1.0 + _p_x * _p_x);
 50   }
 51   XOMP_atomic_start();
 52    *sum =  *sum + _p_sum;
 53   XOMP_atomic_end();
 54   XOMP_barrier();
 55 }
```
We can clearly see an outlined function is generated from the parallel region. 
At line 46, the default loop scheduler (named `XOMP_loop_defaut()`) is called to calculate the right bounds assigned to each thread to implement the worksharing semantics of an OpenMP for directive. 

Now exit the editor (:q in vim). We check the header of the OpenMP runtime layer (named as XOMP), libxomp.h, for the prototype of this scheduler: 
```.term1 
vim $ROSE_SRC/src/midend/programTransformation/ompLowering/libxomp.h +72
```
We can find it has the following form:
```
72 extern void XOMP_loop_default(int lower, int upper, int stride, long* n_lower,long* n_upper);
```

Obviously, the third parameter is to pass the stride of a loop to be scheduled. However, the generated source code wrongfully sets the stride to be (_p_i + 1) instead of 1 in rose_bug_parallel_for_in_rose.c:46.  Also the variable `_p_i` is uninitialized so Adding 1 to it may result in any values, including a negative one which triggers the non-negative stride runtime assertion failure. 

We exit the editor then open a new file: the ROSE compiler source file doing the code transformation for the parallel for loop (or OpenMP lowering):
```.term1
vim $ROSE_SRC/src/midend/programTransformation/ompLowering/omp_lowering.cpp +1559
```
As you can see the call to the runtime scheduler function is inserted at line 1559. The third parameter is copied from `orig_stride` at line 1557. 
If we search the source code backwards, we can find that `orig_stride` is retrieved from a function call named `isCanonicalForLoop()` at line 1449. 

```
1448     if (for_loop)
1449       is_canonical = isCanonicalForLoop (for_loop, &orig_index, & orig_lower, &orig_upper, &orig_stride, NULL, &isIncremental);
...
1557       SgExprListExp* call_parameters = buildExprListExp(copyExpression(orig_lower), copyExpression(orig_upper), copyExpression(orig_stride),
1558           e4, e5);
1559       SgStatement * call_stmt =  buildFunctionCallStmt ("XOMP_loop_default", buildVoidType(), call_parameters, bb1);
1560       appendStatement(call_stmt, bb1);
...
```
The function `isCanonicalForLoop()` is a function within a namespace called `SageInterface` defined in sageInterface.C.  
We exit the editor and open this file to check why it retrieves the wrong stride expression:

```.term1
vim $ROSE_SRC/src/frontend/SageIII/sageInterface/sageInterface.C +11436
```

After examining the code (shown below), we found that this function had a bug so it retrieved the right-hand side (rhs) operator of the entire increment expression `i=i+1`, instead the rhs of the add operator.

```
// relevant sageInterface.C source code implementing retrieval of the stride expression
11546   SgExpression* incr = fs->get_increment(); // grab the increment part of the loop
11547   SgVarRefExp* incr_var = NULL;
11548   switch (incr->variantT()) {  // handle various forms of loop increment expressions
... 
11559     case V_SgAssignOp: { // res = var + incr (or) var - incr (or) incr + var (not allowed: incr-var)
11560       incr_var=isSgVarRefExp(SkipCasting(isSgBinaryOp(incr)->get_lhs_operand()));
...
11573       if(SgVarRefExp* varRefExp=isSgVarRefExp(SkipCasting(isSgBinaryOp(arithOp)->get_lhs_operand()))) {
11674         // cases : var + incr, var - incr
11675         incr_var=varRefExp;
11676         stepast=isSgBinaryOp(incr)->get_rhs_operand();
11677       } else if(SgVarRefExp* varRefExp=isSgVarRefExp(SkipCasting(isSgBinaryOp(arithOp)->get_rhs_operand()))) {
11678         if(isSgAddOp(arithOp)) {
11679           // case : incr + var (not allowed: incr-var)
11680           incr_var=varRefExp;
11681           stepast=isSgBinaryOp(incr)->get_lhs_operand();
11682         }
11683       }
...
``` 
We are done with the diagnosis of the bug. 

## D. Fix the Bug

You can directly go to 11576 of sageInterface.C to do the fix.

On the line 11576 and 11581, change the variable ```incr``` to ```arithOp```.
```
---11576        stepast=isSgBinaryOp(incr)->get_rhs_operand();
+++11576        stepast=isSgBinaryOp(arithOp)->get_rhs_operand();
...
---11581        stepast=isSgBinaryOp(incr)->get_lhs_operand();
+++11581        stepast=isSgBinaryOp(arithOp)->get_lhs_operand();
```
Save your changes and quite your editor (e.g. Use ```:wq``` to save and quit for vim).

#### Rebuild and test

First we need to rebuild ROSE to make our modification effective.
```.term1
cd $ROSE_BUILD && make core -j4 > /dev/null && make install-core > /dev/null
```
This step may take one minute or two. Some warnings about Makefile may show up but you can safely ignore them for now. 

#### Generate the output
```.term1
cd $EXAMPLE_DIR && rose-compiler -rose:openmp:lowering -lxomp -lomp bug_parallel_for_in_rose.c
```

#### Test the generated executable

Run the binary and it shows ```3.141593```.
```.term1
./a.out
```

The generated source code also calculates the loop stride correctly.
```.term1
vim rose_bug_parallel_for_in_rose.c +46
```
We can see the loop scheduler now has the right stride of value 1 used as its 3rd parameter.
```
46   XOMP_loop_default(0,num_steps - 1, 1,&p_lower_,&p_upper_);
```

Congratulations! You have learnt how to fix OpenMP implementation bugs.
