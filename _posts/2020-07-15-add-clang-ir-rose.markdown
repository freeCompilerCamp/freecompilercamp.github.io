---
layout: post
title:  "How to support a Clang IR in ROSE compiler with Clang frontend"
author: "@ouankou"
date:   2020-07-15
categories: beginner
tags: [llvm,clang,openmp,rose]
image: freecompilercamp/pwc:rose-clang-add-node
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

ROSE compiler can use Clang as frontend instead of EDG. With this replacement, we can take the advantage of OpenMP support in Clang/LLVM and remove the dependency of proprietary EDG.
However, the Clang support in ROSE compiler is still at the early stage. There could be many Clang IRs that it's unable to recognize, which leads to a compilation failure.
In this tutorial we will cover how to support a new Clang IR in ROSE compiler. The goal of this tutorial is to compile a hello-world program successfully.


The following example is the hello-world program used in this tutorial.

```.term1
cat << EOF > hello-world.c
#include <stdio.h>
int main() {
   printf("Hello World from C\n");
   return 0;
}
EOF
```

Check the create source code and you should see the same content as above.

```.term1
cat hello-world.c
```

### Clang IR - `clang::Decl::Var`


By default, ROSE compiler with Clang frontend can't compile this example due to unsupported Clang IR. While traversing the Clang AST, ROSE will encounter an unknown Clang IR node and can't continue.

```.term1
rose-compiler hello-world.c -o hello-world
```

The following error will be thrown by ROSE.

```
...
Traverse(clang::Decl : 0x21130f0 : _IO_FILE_plus)  visit done : node = 0x7fea7e2628e8
Unknown declacaration kind: Var !
rose-compiler: /home/freecc/source/rose_src/src/frontend/CxxFrontend/Clang/clang-frontend-decl.cpp:317: virtual SgNode *ClangToSageTranslator::Traverse(clang::Decl *): Assertion `false' failed.
Aborted (core dumped)
```

The unknown `Var` declaration refers to `clang::Decl::Var`. After checking the specified line 317 in `clang-frontend-decl.cpp`. We can it is a switch-case statement and this unknown Clang IR falls to the default case that indicates an error.
Therefore, a handler has to be added in the switch-case statement to tell ROSE how to deal with this Clang IR.

To do that, we insert the following code right above the default case at line 315 in that statement.
```
case clang::Decl::Var:
    ret_status = VisitVarDecl((clang::VarDecl *)decl, &result);
    break;
```

```.term1
vim /home/freecc/source/rose_src/src/frontend/CxxFrontend/Clang/clang-frontend-decl.cpp +315
```

### Clang IR - `clang::Stmt::CallExprClass`

After making the modification, we can recompile ROSE to see whether it works now.

```.term1
cd $ROSE_BUILD
make core -j4
make install-core
cd ~
rose-compiler hello-world.c -o hello-world
```

The compilation still failed and ROSE complains that another Clang IR is unknown.

```
...
ClangToSageTranslator::VisitCompoundStmt
Unknown statement kind: CallExpr !
rose-compiler: /home/freecc/source/rose_src/src/frontend/CxxFrontend/Clang/clang-frontend-stmt.cpp:489: virtual SgNode *ClangToSageTranslator::Traverse(clang::Stmt *): Assertion `false' failed.
Aborted (core dumped)
```

In the file mentioned in error information, we can find out that it's a smilar situation, which is the switch statement doesn't have a valid case for this Clang IR.
Therefore, we need to add the corresponding case section as follows.

```
case clang::Stmt::CallExprClass:
    ret_status = VisitCallExpr((clang::CallExpr *)stmt, &result);
    break;
```

```.term1
vim /home/freecc/source/rose_src/src/frontend/CxxFrontend/Clang/clang-frontend-stmt.cpp +486
```

### Clang IR - `clang::ValueStmt`

Again, we need to recompiler ROSE to see the result.

```.term1
cd $ROSE_BUILD
make core -j4
make install-core
cd ~
rose-compiler hello-world.c -o hello-world
```

The compilation still failed and a new unknown Clang IR appears.

```
...
ClangToSageTranslator::VisitCallExpr
ClangToSageTranslator::VisitImplicitCastExpr
ClangToSageTranslator::VisitDeclRefExpr
Lookup symbol for: "printf"
ClangToSageTranslator::VisitFunctionProtoType
ClangToSageTranslator::VisitType
ClangToSageTranslator::VisitExpr
ClangToSageTranslator::VisitValueStmt
rose-compiler: /home/freecc/source/rose_src/src/frontend/CxxFrontend/Clang/clang-frontend-stmt.cpp:1488: virtual bool ClangToSageTranslator::VisitValueStmt(clang::ValueStmt *, SgNode **): Assertion `FAIL_TODO == 0' failed.
Aborted (core dumped)
```

At the specified line 1488 of file `clang-frontend-stmt.cpp`, we can see that it's an unconditional failure, which we can remove for now by deleting this particular line.

```
ROSE_ASSERT(FAIL_TODO == 0); // TODO
```

```.term1
vim /home/freecc/source/rose_src/src/frontend/CxxFrontend/Clang/clang-frontend-stmt.cpp +1488
```

### Result

Now let's compile ROSE the third time.

```.term1
cd $ROSE_BUILD
make core -j4
make install-core
cd ~
rose-compiler hello-world.c -o hello-world
```

Finally! We successfully build both ROSE and the hello-world program!
Under current folder, an executable named `hello-world` and a generated source file will be shown.

```.term1
ls hello-world
ls rose_hello-world.c
```

Running `hello-world` will print a message `Hello World from C`.


```.term1
./hello-world
```

Check the generated `rose_hello-world.c` and it should display the same content as the original `hello-world.c` except minor format difference.

```.term1
cat rose_hello-world.c
```


<span style="color:green">**Congratulations**</span> you were successfully able to support a new Clang IR in ROSE compiler.
