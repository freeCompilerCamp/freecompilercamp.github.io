---
layout: post
title:  "How to Identify a Clause to a new OpenMP Directive in Clang/LLVM compiler"
author: "@alokmishra.besu"
date:   2019-08-10
categories: beginner
tags: [llvm,clang,openmp,directive]
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

In this tutorial we will cover how to add a clause to a new OpenMP directive in Clang/LLVM compiler. The goal of this tutorial is to add the when clause to a new OpenMP directive -- metadirective (`#pragma omp metadirective [clause[[,]clause]...]`), defined in OpenMP Specification 5.0. For this tutorial we will only explain how to identify a clause to a directive. We will cover adding an AST node and lowering in future tutorials.

---

## Step 1 - Get previous tutorial's files
First we should get the files that we updated in the previous tutorial. In your local system you may use your own updated files. Or you can checkout the updated code from our `meta-ast` branch.
```.term1
cd $LLVM_SRC/tools/clang
git checkout meta-ast
```

You may check that all proper code is added from the previous turorial.


## Step 2 - Identify Clause
In the previous tutorial we just identified the `metadirective` token and create its AST node, but did not factor in its clauses.
There are two clause to metadirective - `when` and `default`.

First let us identify the when clause. For this we need to add the token for when in OpenMPKinds.def. So open the file using your favorite editor and go to the same line as before.
```.term1
vim include/clang/Basic/OpenMPKinds.def +892
```

Let us go to line 892, or whichever line you declared the `metadirective` directive in Step 2. After that line we need to add the declaration of the clauses supported by metadirective. In this step we will only add the when clause. We will deal with default clause later.

Add the following code after `OPENMP_DIRECTIVE_EXT(metadirective,"metadirective")`:
```
#ifndef OPENMP_METADIRECTIVE_CLAUSE
#define OPENMP_METADIRECTIVE_CLAUSE(Name)
#endif

// OpenMP clauses.
OPENMP_CLAUSE(when, OMPWhenClause)

// Clauses allowed for OpenMP directive 'metadirective'
OPENMP_METADIRECTIVE_CLAUSE(when)

#undef OPENMP_METADIRECTIVE_CLAUSE
```

Above we declared the `when` clause and the class associated with this clause. Please note that for simplicity of this tutorial, we group these new statements into one place. In real development, they should be scattered in separated code regions in the same source file to conform to the existing coding convention.
 
Next let us declare the class `OMPWhenClause`. We need to declare this in the `OpenMPClause.h` file, located in `include/clang/AST`.
```.term1
vim include/clang/AST/OpenMPClause.h +131
```
This class should extend the class `OMPClause`, so we should make sure we define our class after the definition of `OMPClause`.
```
class OMPWhenClause : public OMPClause {
public:
  OMPWhenClause()
    : OMPClause(OMPC_when, SourceLocation(), SourceLocation()) {}
};
```

Note that we defined the default constructor to instantiate with `OMPC_when` token.

Next we need to tell the compiler that this clause is an allowed clause for metadirective. For this we need to update the `clang::isAllowedClauseForDirective` function defined in `OpenMPKinds.cpp`, located in `lib/Basic`.
```.term1
vim lib/Basic/OpenMPKinds.cpp +352
```
Here we locate the functiona `isAllowedClauseForDirective` and add the following code to the switch case (line 352)
```
  case OMPD_metadirective:
    switch (CKind) {
#define OPENMP_METADIRECTIVE_CLAUSE(Name) \
  case OMPC_##Name:                       \
    return true;
#include "clang/Basic/OpenMPKinds.def"
    default:
      break;
    }
    break;
```

So we have declared the token for `when` clause and updated the function to let the compiler know that `when` is a valid clause of `metadirective`. Next we need to parse this clause. As before we will modify the file `ParseOpenMP.cpp`

```.term1
vim lib/Parse/ParseOpenMP.cpp +999
```

Here we need to make two changes. First where we consumed the `metadirective` token in Step 3, we will also add code to consume the `when` clause. Let us go to line 999, or whichever line you added the metadirective code in Step 3. Now update that case as follows (replacing old case `OMPD_metadirective:{...}` with the new one):
```
  case OMPD_metadirective: {
    std::cout <<"METADIRECTIVE is caught\n";
    ConsumeToken();
    ParseScope OMPDirectiveScope(this, ScopeFlags);

    while (Tok.isNot(tok::annot_pragma_openmp_end)) {
      OpenMPClauseKind CKind = Tok.isAnnotation()
              ? OMPC_unknown
              : FlushHasClause ? OMPC_flush
                               : getOpenMPClauseKind(PP.getSpelling(Tok));
      Actions.StartOpenMPClause(CKind);
      FlushHasClause = false;
      OMPClause *Clause =
          ParseOpenMPClause(DKind, CKind, !FirstClauses[CKind].getInt());
      FirstClauses[CKind].setInt(true);
      if (Clause) {
        FirstClauses[CKind].setPointer(Clause);
        Clauses.push_back(Clause);
      }

      // Skip ',' if any.
      if (Tok.is(tok::comma))
        ConsumeToken();
      Actions.EndOpenMPClause();
    }
    EndLoc = Tok.getLocation();
    ConsumeAnnotationToken();
    break;
  }
```

In the above code we are calling the `ParseOpenMPClause` function to identify the clause. So as the second change we need to update this function to identify the when clause. So locate the function `ParseOpenMPClause(OpenMPDirectiveKind DKind, OpenMPClauseKind CKind, bool FirstClause)`, and find the `switch (CKind){...}` statement within this function (around line 1331) to add the following case:
```
  case OMPC_when:
    std::cout << "WHEN clause is caught\n";
    Clause = ParseOpenMPClause(CKind, WrongDirective);
    break;
```

Here we print out <span style="color:blue">**WHEN clause is caught**</span>  and then use the default ParseOpenMPClause function to consume this clause.

If we build the compiler now, it will build completely, but will give out a bunch of linking error. You may go ahead and try it.
These errors are caused due to the auto code generation which wants to visit the node of when clause. We will be covering these functions in detail in future. For the time being, to silence the linking error, let us define these functions.

In the file `ASTReader.cpp`, located in `lib/Serialization`, goto `OMPClauseReader implementations` (line 11660)
```.term1
vim lib/Serialization/ASTReader.cpp +11660
```
and add the following code:
```
void OMPClauseReader::VisitOMPWhenClause(OMPWhenClause *C) {}
```

In the file `ASTWriter.cpp`, located in `lib/Serialization`, goto `OMPClause Serialization` (line 6474)
```.term1
vim lib/Serialization/ASTWriter.cpp +6474
```
and add the following code:
```
void OMPClauseWriter::VisitOMPWhenClause(OMPWhenClause *C) {}
```

In the file `RecursiveASTVisitor.h`, located in `include/clang/AST`, goto after the definition of `RecursiveASTVisitor` (line 543)
```.term1
vim include/clang/AST/RecursiveASTVisitor.h +543
```
and update the code as follows:
```
template <typename Derived>
bool RecursiveASTVisitor<Derived>::VisitOMPWhenClause(OMPWhenClause *C) {
  return true;
}
```

In the file `TreeTransform.h`, located in `lib/Sema`, goto right before the definition of `TreeTransform` (line 3271)
```.term1
vim lib/Sema/TreeTransform.h +3271
```
and update the code as follows:
```
template <typename Derived>
OMPClause *TreeTransform<Derived>::TransformOMPWhenClause(OMPWhenClause *C) {
  return nullptr;
}
```

In the file `OpenMPClause.cpp`, located in `lib/AST`, goto `OpenMP clauses printing method` (line 1061)
```.term1
vim lib/AST/OpenMPClause.cpp +1061
```
and update the code as follows:
```
void OMPClausePrinter::VisitOMPWhenClause(OMPWhenClause *Node) {
  OS << "when";
}
```


In the file `StmtProfile.cpp`, located in `lib/AST`, goto after the definition of `OMPClauseProfiler` (line 421)
```.term1
vim lib/AST/StmtProfile.cpp +421
```
and update the code as follows:
```
void OMPClauseProfiler::VisitOMPWhenClause(const OMPWhenClause *C) {}
```


In the file `CIndex.cpp`, located in `tools/libclang`, goto after the definition of `OMPClauseEnqueue` (line 2138)
```.term1
vim tools/libclang/CIndex.cpp +2138
```
and update the code as follows:
```
void OMPClauseEnqueue::VisitOMPWhenClause(const OMPWhenClause *C) {}
```

This should resolve all the linking errors encountered before. Now rebuild the source code as before and test our code. This step may take a few minutes.

```.term1
cd $LLVM_BUILD && make -j8 install > /dev/null
```

You might get a couple of warnings about `enumeration value 'OMPC_when' not handled in switch`. Ignore these warnings for now. We will handle them later. Once the code builds successfully and is installed, its time to test a small program. Let us create a new test file, which is not really legal OpenMP yet but enough to test the current extended compiler:

```.term1
cat <<EOF > meta_when.c
int main()
{
#pragma omp metadirective when
    for(int i=0; i<10; i++)
    ;
    return 0;
}
EOF
```

Now you have a new test file `meta_when.c` which uses the `metadirective` directive with clause `when`. Build this file using your Clang compiler.

```.term1
clang -fopenmp meta_when.c
```

you should get an output 
`METADIRECTIVE is caught. 
WHEN clause is caught`. 

<span style="color:green">**Congratulations**</span> you were successfully able to identify the when clause to metadirective in openmp in Clang compiler.

