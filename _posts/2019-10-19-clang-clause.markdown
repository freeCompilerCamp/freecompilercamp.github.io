---
layout: post
title:  "Identifying a Clause of new Directive in OpenMP (Clang)"
author: "@alokmishra.besu"
date:   2019-10-19
categories: beginner
tags: [llvm,clang,openmp,clause,directive]
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

In the [previous tutorial](http://freecompilercamp.org/clang-ast-node) we learnt how to add an AST Node for the new OpenMP directive in Clang/LLVM compiler.
In this tutorial we will cover how to identify and add a clause for the new OpenMP directive in Clang/LLVM compiler. 

The goal of this tutorial is to add an AST Node for a new OpenMP directive -- allocate (`#pragma omp allocate(A)`).
Since allocate does not have any clause, we will be implementing a pseudo-clause to read the parameter inside the brackets.

---

### **Step 1 - Get previous tutorial's files**
First we should get the files that we updated in the previous tutorial. In your local system you may use your own updated files. 
Or you can checkout the updated code from our `alloc-ast` branch.
```.term1
cd $LLVM_SRC/tools/clang
git fetch
git checkout alloc-ast
```

You may veify that all proper code is added from the previous turorial.

### **Step 2 - Identifying a Clause**
First we need to define the token for the clause. 
Remember from the [tutorial about adding token for a new directive](http://www.freecompilercamp.org/clang-new-directive/), we need to declare the token in `OpenMPKinds.def`.
So let us open the OpenMPKinds.def file
```.term1
vi include/clang/Basic/OpenMPKinds.def +240
```
We have already added a declaration for allocate directive. 
We will add a declaration for allocate clause. 
Now allocate by default does not have a clause.
So we will create a pseudo clause by the same name `allocate` and declare the name of the class for the clause as `OMPAllocateClause`.
Insert the following text where OpenMP clauses are declared.
```
OPENMP_CLAUSE(allocate, OMPAllocateClause)
```
Here basically we are defining that there is a clause `allocate` which is defined by the class `OMPAllocateClause`.

Next we declare the OMPAllocateClause in `OpenMPClause.h`.
```.term1
vi include/clang/AST/OpenMPClause.h +3303
```
Add the following code in this file.
```
class OMPAllocateClause final
    : public OMPVarListClause<OMPAllocateClause>,
      private llvm::TrailingObjects<OMPAllocateClause, Expr *> {
  friend TrailingObjects;
  friend OMPVarListClause;

  OMPAllocateClause(SourceLocation StartLoc,
                    SourceLocation LParenLoc,
                    SourceLocation EndLoc,
                    unsigned N)
      : OMPVarListClause<OMPAllocateClause>(OMPC_allocate,
                                            StartLoc,
                                            LParenLoc,
                                            EndLoc,
                                            N) {}

  explicit OMPAllocateClause(unsigned N)
      : OMPVarListClause<OMPAllocateClause>(OMPC_allocate,
                                            SourceLocation(),
                                            SourceLocation(),
                                            SourceLocation(),
                                            N) {}

public:
  static OMPAllocateClause *Create(const ASTContext &C,
                                   SourceLocation StartLoc,
                                   SourceLocation LParenLoc,
                                   SourceLocation EndLoc,
                                   ArrayRef<Expr *> VL);
  static OMPAllocateClause *CreateEmpty(const ASTContext &C, unsigned N);

  child_range children() {
    return child_range(reinterpret_cast<Stmt **>(varlist_begin()),
                       reinterpret_cast<Stmt **>(varlist_end()));
  }

  static bool classof(const OMPClause *T) {
    return T->getClauseKind() == OMPC_allocate;
  }
};
```
Here we are defining the `OMPAllocateClause` class. 
This class represents implicit clause 'allocate' for the '#pragma omp allocate' directive.
This clause does not exist by itself, it can be only as a part of 'omp allocate' directive. 
This clause is introduced to keep the original structure of `OMPExecutableDirective` class and its derivatives and to use the existing infrastructure of clauses with the list of variables.

Here we declare 2 constructors -- One defined with the Start & End locations of the clause, the location for left parenthesis and number of variables in the clause. 
The other constrcutor builds an empty clause.
Note that we defined the default constructor to instantiate with `OMPC_allocate` token.

Most importantly we need to add the Create function which creates the clause.
We also define the `children` and `classof` functions.

We define the Create functions in the file `OpenMPClause.cpp`
```.term1
vi lib/AST/OpenMPClause.cpp +1057
```
In the Create function we allocate the required space for the clause and create the clause. We also define the CreateEmpty function.
```
OMPAllocateClause *OMPAllocateClause::Create(const ASTContext &C,
                                             SourceLocation StartLoc,
                                             SourceLocation LParenLoc,
                                             SourceLocation EndLoc,
                                             ArrayRef<Expr *> VL) {
  void *Mem = C.Allocate(totalSizeToAlloc<Expr *>(VL.size() + 1));
  OMPAllocateClause *Clause =
      new (Mem) OMPAllocateClause(StartLoc, LParenLoc, EndLoc, VL.size());
  Clause->setVarRefs(VL);
  return Clause;
}

OMPAllocateClause *OMPAllocateClause::CreateEmpty(const ASTContext &C,
                                                  unsigned N) {
  void *Mem = C.Allocate(totalSizeToAlloc<Expr *>(N));
  return new (Mem) OMPAllocateClause(N);
}
```

We also define a visitor for `OMPClausePrinter` in this file. 
Go to the end of the file (line 1515) and add the following code
```
void OMPClausePrinter::VisitOMPAllocateClause(OMPAllocateClause *Node) {
  if (!Node->varlist_empty()) {
    VisitOMPClauseList(Node, '(');
    OS << ")";
  }
} 
```

Next we need to tell the compiler that this clause is an allowed clause for allocate directive. 
For this we need to update the clang::isAllowedClauseForDirective function defined in `OpenMPKinds.cpp`, located in *lib/Basic*.
```.term1
vim lib/Basic/OpenMPKinds.cpp +767
```
```
  case OMPD_allocate:
    return CKind == OMPC_allocate;
    break;
```
Now the `allocate` clause cannot be specified explicitly, because this is an implicit clause for `allocate` directive. 
If the allocate clause is explicitly specified the Parser should generate a warning about extra tokens at the end of the directive.
To do this we go to the function `getOpenMPClauseKind` in the same file (line 53) and update the following code
```
--- if (Str == "flush")
+++ if (Str == "flush" || Str == "allocate")
```
Similar functionality is already defined for `flush`. We will just reuse it here.

So we have declared the token for allocate clause and updated the function to let the compiler know that when is a valid clause of allocate directive.
Next we need to parse this clause. 
As before we will modify the file `ParseOpenMP.cpp`.
```.term1
vim lib/Parse/ParseOpenMP.cpp +995
```

We will go to the function `ParseOpenMPDeclarativeOrExecutableDirective`. 
We will first decleare a bool variable AllocateHasClause and instatiate it as `false`. 
```
  bool AllocateHasClause = false;
```
Then we remove our previous definition of `OMPD_allocate` (line 999)
```
  case OMPD_allocate: {
    llvm::errs() <<"ALLOCATE is caught\n";
    ConsumeToken();
    ParseScope OMPDirectiveScope(this, ScopeFlags);
    Actions.StartOpenMPDSABlock(DKind, DirName, Actions.getCurScope(), Loc);
    ConsumeAnnotationToken();
    Directive = Actions.ActOnOpenMPExecutableDirective(
        DKind, DirName, CancelRegion, Clauses, nullptr, Loc,
       EndLoc);

    // Exit scope.
    Actions.EndOpenMPDSABlock(Directive.get());
    OMPDirectiveScope.Exit();
    break;
  }
```
and replace it with the following code:
```
  case OMPD_allocate: {
    llvm::errs() <<"ALLOCATE is caught\n";
    if (PP.LookAhead(0).is(tok::l_paren)) {
      AllocateHasClause = true;
      // Push copy of the current token back to stream to properly parse
      // pseudo-clause OMPAllocateClause.
      PP.EnterToken(Tok);
    }
    ConsumeToken();
    ParseScope OMPDirectiveScope(this, ScopeFlags);
    Actions.StartOpenMPDSABlock(DKind, DirName, Actions.getCurScope(), Loc);
    while (Tok.isNot(tok::annot_pragma_openmp_end)) {
      OpenMPClauseKind CKind =
          Tok.isAnnotation()
              ? OMPC_unknown
              : AllocateHasClause ? OMPC_allocate
                               : getOpenMPClauseKind(PP.getSpelling(Tok));
      Actions.StartOpenMPClause(CKind);
      AllocateHasClause = false;
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
    // End location of the directive.
    EndLoc = Tok.getLocation();
    ConsumeAnnotationToken();
    Directive = Actions.ActOnOpenMPExecutableDirective(
        DKind, DirName, CancelRegion, Clauses, nullptr, Loc,
        EndLoc);

    // Exit scope.
    Actions.EndOpenMPDSABlock(Directive.get());
    OMPDirectiveScope.Exit();
    break;
  }
```
Notice we did not need to remove any of the previous code. 
We just added lines which are needed for parsing the `allocate` clause.

Next we update the `ParseOpenMPClause` function (line 1471) to handle the allocate clause.
```
  case OMPC_allocate:
```
Note that here we will add our case in the place to call the `ParseOpenMPVarListClause` function.

Next step is to do some semantics analysis. 
Remember when adding the AST Node for our allocate directive we added the ActOnOpenMPAllocateDirective function in `Sema.h` and `SemaOpenMP.cpp` files.
Similarily we will add the `ActOnOpenMPAllocateClause` function in the same files.

```.term1
vim include/clang/Sema/Sema.h +9391
```
We declare our function here
```
  OMPClause *ActOnOpenMPAllocateClause(ArrayRef<Expr *> VarList,
                                       SourceLocation StartLoc,
                                       SourceLocation LParenLoc,
                                       SourceLocation EndLoc);
```
Then we define our function in the `SemaOpenMP.cpp` file.
```.term1
vim lib/Sema/SemaOpenMP.cpp +13945
```
Here we simply call the Create function of the OMPAllocateClause funtion
```
OMPClause *Sema::ActOnOpenMPAllocateClause(ArrayRef<Expr *> VarList,
                                           SourceLocation StartLoc,
                                           SourceLocation LParenLoc,
                                           SourceLocation EndLoc) {
  if (VarList.empty())
    return nullptr;

  return OMPAllocateClause::Create(Context, StartLoc, LParenLoc, EndLoc, VarList);
}
```

While parsing this clause we called the `ParseOpenMPVarListClause` function.
So in this file we will also update the `ActOnOpenMPVarListClause` function (line 9702) to handle allocate clause.
```
  case OMPC_allocate:
    Res = ActOnOpenMPAllocateClause(VarList, StartLoc, LParenLoc, EndLoc);
    break;
```

If we build the compiler now, it might build completely, but will give out a bunch of linking error.
These errors are caused due to the auto code generation which wants to visit the node of when clause. 
These visitors should be defined in the following classes
1. RecursiveASTVisitor.h
2. StmtProfile.cpp 
3. ASTReader.cpp
4. ASTWriter.cpp 
5. CIndex.cpp

Let us now define these visit functions.
First let us open `RecursiveASTVisitor.h`
```.term1
vim include/clang/AST/RecursiveASTVisitor.h +3260
```
```
template <typename Derived>
bool RecursiveASTVisitor<Derived>::VisitOMPAllocateClause(OMPAllocateClause *C) {
  TRY_TO(VisitOMPClauseList(C));
  return true;
}
```

Next open the `StmtProfile.cpp` file
```.term1
vim lib/AST/StmtProfile.cpp +755
```
```
void OMPClauseProfiler::VisitOMPAllocateClause(
    const OMPAllocateClause *C) {
  VisitOMPClauseList(C);
}
```
Then we open the `ASTReader.cpp` file
```.term1
vim lib/Serialization/ASTReader.cpp +12563
```
```
void OMPClauseReader::VisitOMPAllocateClause(OMPAllocateClause *C) {
  C->setLParenLoc(Record.readSourceLocation());
  unsigned NumVars = C->varlist_size();
  SmallVector<Expr *, 16> Vars;
  Vars.reserve(NumVars);
  for (unsigned i = 0; i != NumVars; ++i)
    Vars.push_back(Record.readSubExpr());
  C->setVarRefs(Vars);
}
```
In this file we also define the action to takw when an empty `readClause` is called. 
Basically we will be calling the CreateEmpty function there. 
For this we go to the definition of readClause and go to the end of the swithc statement (line 11855).
Here we add our case as
```
  case OMPC_allocate: {
    C = OMPAllocateClause::CreateEmpty(Context, Record.readInt());
    break;
  }
```

Next open `ASTWriter.cpp`
```.term1
vim lib/Serialization/ASTWriter.cpp +6956
```
```
void OMPClauseWriter::VisitOMPAllocateClause(OMPAllocateClause *C) {
  Record.push_back(C->varlist_size());
  Record.AddSourceLocation(C->getLParenLoc());
  for (auto *VE : C->varlists())
    Record.AddStmt(VE);
}
```

Lastly open up the CIndex.cpp file
```.term1
vim tools/libclang/CIndex.cpp +2423
```
And add the following code
```
void OMPClauseEnqueue::VisitOMPAllocateClause(const OMPAllocateClause *C) {
  VisitOMPClauseList(C);
}
```

We also need to add the functionality for semantic tree transformation that allows one to transform one abstract syntax tree into another.
For this we open the `TreeTransform.h` file
```.term1
vim lib/Sema/TreeTransform.h +9327
```
and add our code for `TransformOMPAllocateClause`
```
template <typename Derived>
OMPClause *TreeTransform<Derived>::TransformOMPAllocateClause(OMPAllocateClause *C) {
  llvm::SmallVector<Expr *, 16> Vars;
  Vars.reserve(C->varlist_size());
  for (auto *VE : C->varlists()) {
    ExprResult EVar = getDerived().TransformExpr(cast<Expr>(VE));
    if (EVar.isInvalid())
      return nullptr;
    Vars.push_back(EVar.get());
  }
  return getDerived().RebuildOMPAllocateClause(Vars, 
                                               C->getBeginLoc(),
                                               C->getLParenLoc(), 
                                               C->getEndLoc());
}
```
Here we are calling the RebuildOMPAllocateClause function. 
This function builds a new OpenMP *allocate* pseudo clause.
By default, it performs semantic analysis to build the new OpenMP clause.
Subclasses may override this routine to provide different behavior.

We define this function with the rest of the *RebuildOMP___Clause* (line 1936) function in the TreeTransform class
```
  OMPClause *RebuildOMPAllocateClause(ArrayRef<Expr *> VarList,
                                      SourceLocation StartLoc,
                                      SourceLocation LParenLoc,
                                      SourceLocation EndLoc) {
    return getSema().ActOnOpenMPAllocateClause(VarList, StartLoc, LParenLoc,
                                               EndLoc);
  }
```



### **Step 3 - Building LLVM and testing code**
To build `LLVM` go to the `LLVM_BUILD` directory and run make. 
We are redirecting the output of make to /dev/null to have a clean output. 
Warning and error messages will still show up if there are any.

```.term1
cd $LLVM_BUILD && make -j8 install > /dev/null
```

You might get a couple of warnings about `enumeration value 'OMPC_allocate' not handled in switch`. 
Ignore these warnings for now; you can `handle them later. 
Once the code builds successfully and is installed, its time to test a small program. 
Let us get a new test file

```.term1
wget https://raw.githubusercontent.com/chunhualiao/freecc-examples/master/allocate/alloc2.c
```

Now you have a new test file `alloc2.c` which uses the `allocate` directive. The content of the file should be as follows:
```
int main()
{
    int *A;
#pragma omp allocate(A)
    return 0;
}
```

Build this file using your Clang compiler.

```.term1
clang -cc1 -ast-dump -fopenmp alloc2.c
```

You should get an AST tree with OMPAllocateDirective Node and another node for the OMPAllocateClause clause.

<span style="color:green">**Congratulations**</span> you were successfully able to identify the clause for a new directive to openmp in Clang compiler.

