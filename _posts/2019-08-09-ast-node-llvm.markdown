---
layout: post
title:  "How to add an AST Node for a new OpenMP directive in Clang/LLVM compiler"
author: "@alokmishra.besu"
date:   2019-06-27
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

In the [previous tutorial](http://freecompilercamp.org/new-directive-llvm) we learnt how to identify or parse a new OpenMP directive in Clang/LLVM. In this tutorial we will cover how to add an AST Node for the new OpenMP directive in Clang/LLVM compiler. The goal of this tutorial is to add an AST Node for a new OpenMP directive -- metadirective (`#pragma omp metadirective [clause[[,]clause]...]`).

---

## Step 1 - Get previous tutorial's files
First we should get the files that we updated in the previous tutorial. In your local system you may use your own updated files. Or you can checkout the updated code from our `meta` branch.
```.term1
cd $LLVM_SRC/tools/clang
git checkout meta
```

You may check that all proper code is added in OpenMPKinds.def and ParseOpenMP.cpp from the previous turorial.

## Step 2 - Adding New AST Node
First step is to add a Statement Node, which are defined in the file `StmtNodes.td`. Clang reads this file and generates a StmtNodes.inc file, which is used to define different statement classes and read by several classes to define their node visitor function. We define an OMPMetaDirective node, which extends the OMPExecutableDirective class - a basic class for representing single OpenMP executable directive. We modify the file `StmtNodes.td` and go to the line after the definition of OMPExecutableDirective (line 206)
```.term1
vim include/clang/Basic/StmtNodes.td +206
```
and add our own definition of OMPMetaDirective
```
def OMPMetaDirective : DStmt<OMPExecutableDirective>;
```


Next let us define the `OMPMetaDirective` class. For this we will modify the `StmtOpenMP.h` file which defines OpenMP AST classes for executable directives and clauses. Our class extends the OMPExecutableDirective class,so we will keep our definition after the definition of OMPExecutableDirective. Let us open the file `StmtOpenMP.h` and go to the end of the definition of OMPExecutableDirective (line 266)
```.term1
vim include/clang/AST/StmtOpenMP.h +266
```
Now let us add our class `OMPMetaDirective`. This class will represent the `#pragma omp metadirective` directive. We will add constructors to build a directive with the given start and end location, and the number of clauses. We will also add an empty constructor. Most importantly we need to add the Create function which creates directive with a list of Clauses. Also a CreateEmpty function which creates an empty directive with the place for N clauses. Finally we also define a classof function which checks if an object is the class of OMPMetaDirectiveClass.
```
class OMPMetaDirective : public OMPExecutableDirective {
  friend class ASTStmtReader;
  // true if the construct has inner cancel directive.
  bool HasCancel;

  OMPMetaDirective(SourceLocation StartLoc, SourceLocation EndLoc, unsigned NumClauses)
    : OMPExecutableDirective(this, OMPMetaDirectiveClass, OMPD_metadirective,
                            StartLoc, EndLoc, NumClauses, 1),
        HasCancel(false) {}

  explicit OMPMetaDirective(unsigned NumClauses)
    : OMPExecutableDirective(this, OMPMetaDirectiveClass, OMPD_metadirective,
                            SourceLocation(), SourceLocation(), NumClauses,
                            1),
        HasCancel(false) {}

  void setHasCancel(bool Has) { HasCancel = Has; }

public:
  static OMPMetaDirective *
  Create(const ASTContext &C, SourceLocation StartLoc, SourceLocation EndLoc,
        ArrayRef<OMPClause *> Clauses, Stmt *AssociatedStmt, bool HasCancel);

  static OMPMetaDirective *CreateEmpty(const ASTContext &C,
                                        unsigned NumClauses, EmptyShell);

  bool hasCancel() const { return HasCancel; }

  static bool classof(const Stmt *T) {
    return T->getStmtClass() == OMPMetaDirectiveClass;
  }
};
```

Next we define the Create and CreateEmpty functions for OMPMetaDirective class. The definitions of these functions are in the file `StmtOpenMP.cpp`. We can define our functions anywhere in this file.
```.term1
vim lib/AST/StmtOpenMP.cpp
```
These functions  allocate sufficient memory for the directive and instantiate the required variables. The definition of these functions are self explanatory. You may have to consult the Doxygen documentation of Clang/LLVM APIs to understand the semantics and parameters of functions being used in the code.  The link is https://llvm.org/doxygen/index.html . 

```
OMPMetaDirective *OMPMetaDirective::Create(
    const ASTContext &C, SourceLocation StartLoc, SourceLocation EndLoc,
    ArrayRef<OMPClause *> Clauses, Stmt *AssociatedStmt, bool HasCancel) {
  unsigned Size = llvm::alignTo(sizeof(OMPMetaDirective), alignof(OMPClause *));
  void *Mem = C.Allocate(Size + sizeof(OMPClause *) * Clauses.size() + sizeof(Stmt *));

  OMPMetaDirective *Dir = new (Mem) OMPMetaDirective(StartLoc, EndLoc, Clauses.size());
  Dir->setClauses(Clauses);
  Dir->setAssociatedStmt(AssociatedStmt);
  Dir->setHasCancel(HasCancel);
  return Dir;
}

OMPMetaDirective *OMPMetaDirective::CreateEmpty(const ASTContext &C,
                                                        unsigned NumClauses,
                                                        EmptyShell) {
  unsigned Size = llvm::alignTo(sizeof(OMPMetaDirective), alignof(OMPClause *));
  void *Mem = C.Allocate(Size + sizeof(OMPClause *) * NumClauses + sizeof(Stmt *));

  return new (Mem) OMPMetaDirective(NumClauses);
}
```


To define an AST Node, we also need to define all its visitors.
The major visitors are defined in
* RecursiveASTVisitor.h - This file defines the RecursiveASTVisitor interface, which recursively traverses the entire AST.
* StmtPrinter.cpp - This file implements the Stmt::dumpPretty/Stmt::printPretty methods, which pretty print the AST back out to C code.
* StmtProfile.cpp - This file implements the Stmt::Profile method, which builds a unique bit representation that identifies a statement/expression.
* ASTReaderStmt.cpp - Implements Statements and Expression deserialization.  This implements the ASTReader::ReadStmt method.
* ASTWriterStmt.cpp - Implements serialization for Statements and Expressions.


In `RecursiveASTVisitor.h` file a macro is defined for Stmts to automate iterating over the children defined in children() (every stmt defines these, though sometimes the range is empty).  Each individual Traverse method only needs to worry about children other than those.

To define our own traverse method for metadirective, we will use this macro. We wil add our traverse method after the definition of the macro `DEF_TRAVERSE_STMT` (ends at line 2118).
```.term1
vim include/clang/AST/RecursiveASTVisitor.h +2119
```
Add the following definition
```
DEF_TRAVERSE_STMT(OMPMetaDirective, { TRY_TO(TraverseOMPExecutableDirective(S)); })
```

In `StmtPrinter.cpp` we define the VisitOMPMetaDirective function, which calls the PrintOMPExecutableDirective function. Let us go to the file `StmtPrinter.cpp`, after the definition of PrintOMPExecutableDirective (line 641)
```.term1
vim lib/AST/StmtPrinter.cpp +641
```
And add our definition of VisitOMPMetaDirective
```
void StmtPrinter::VisitOMPMetaDirective(OMPMetaDirective *Node) {
  Indent() << "#pragma omp metadirective";
  PrintOMPExecutableDirective(Node);
}
```


Similarly in `StmtProfile.cpp` we add the definition of VisitOMPMetaDirective after the definition of VisitOMPExecutableDirective.
```.term1
vim lib/AST/StmtProfile.cpp +769
```
VisitOMPMetaDirective simply calls the VisitOMPExecutableDirective function.
```
void StmtProfiler::VisitOMPMetaDirective(const OMPMetaDirective *S) {
  VisitOMPExecutableDirective(S);
}
```



Before we define how to read our statement, first we need to create a record for our statement in the `enum StmtCode`. These constants describe the records that describe statements or expressions. These records  occur within type and declarations block, so they begin with record values of 128.  Each constant describes a record for a specific statement or expression class in the AST. To add our own record we modify the StmtCode enum in `ASTBitCodes.h` file. In general we could add our record anywhere in the enum (or where OpenMP directives are defined), but we could not like to upset the current state of the code. So we will add our record at the end of the enum (after line 1977).
```.term1
vim include/clang/Serialization/ASTBitCodes.h +1977
```
Add our record after line 1977
```
      STMT_OMP_META_DIRECTIVE,
```


In ASTReaderStmt.cpp, expressions are stored in Reverse Polish Notation, with each of the subexpressions preceding the expression they are stored in. Subexpressions are stored from last to first. To evaluate expressions, we continue reading expressions and placing them on the stack, with expressions having operands removing those operands from the stack. Evaluation terminates when we see a STMT_STOP record, and the single remaining expression on the stack is our result.
```.term1
vim lib/Serialization/ASTReaderStmt.cpp +3396
```
We modify the function `ReadStmtFromStream` to read our statement. We go to the end of the switch case (line 3396) and add our own case where we create an empty OMPMetaDirective statement.
```
    case STMT_OMP_META_DIRECTIVE:
      S = OMPMetaDirective::CreateEmpty(Context,
                                        Record[ASTStmtReader::NumStmtFields],
                                        Empty);
      break;
```

We also add a definition for the function VisitOMPMetaDirective, anywhere in the file after the definition of the class ASTStmtReader and the function VisitOMPExecutableDirective (line 1920)
```
void ASTStmtReader::VisitOMPMetaDirective(OMPMetaDirective *D) {
  VisitStmt(D);
  Record.skipInts(1);
  VisitOMPExecutableDirective(D);
  D->setHasCancel(Record.readInt());
}
```

In ASTWriterStmt.cpp we define the function VisitOMPMetaDirective preferably after the definition of VisitOMPExecutableDirective (line 1889)
```.term1
vim lib/Serialization/ASTWriterStmt.cpp +1889
```
We assign the code as our recently defined STMT_OMP_META_DIRECTIVE
```
void ASTStmtWriter::VisitOMPMetaDirective(OMPMetaDirective *D) {
  VisitStmt(D);
  Record.push_back(D->getNumClauses());
  VisitOMPExecutableDirective(D);
  Record.push_back(D->hasCancel() ? 1 : 0);
  Code = serialization::STMT_OMP_META_DIRECTIVE;
}
```

We also need to define a tree transformation in `TreeTransform.h` - This file implements a semantic tree transformation that takes a given AST and rebuilds it, possibly transforming some nodes in the process. Using StmtNode.td, this class will already declare the TransformOMPMetaDirective function. Here we need to define it, after the definition of TransformOMPExecutableDirective. So let us open the file `TreeTransform.h` 
```.term1
vim lib/Sema/TreeTransform.h +7756
```
and define the function as
```
template <typename Derived>
StmtResult
TreeTransform<Derived>::TransformOMPMetaDirective(OMPMetaDirective *D) {
  DeclarationNameInfo DirName;
  getDerived().getSema().StartOpenMPDSABlock(OMPD_metadirective, DirName, nullptr,
                                             D->getBeginLoc());
  StmtResult Res = getDerived().TransformOMPExecutableDirective(D);
  getDerived().getSema().EndOpenMPDSABlock(Res.get());
  return Res;
}
```


Once our statement is defined, it is time to parse our new directive, this time creating an AST Node for the directive. We will again modify the `ParseOpenMP.cpp` file to modify the case we added in the previous tutorial. 
```.term1
vim lib/Parse/ParseOpenMP.cpp +998
```

In the last tutorial, we simply consumed the token and break out of the switch case. Now we will instantiate the scope of the directive, get the associated statement and create the Directive.
```
  case OMPD_metadirective: {
    llvm::errs() <<"METADIRECTIVE is caught\n";
    ConsumeToken();
    ParseScope OMPDirectiveScope(this, ScopeFlags);
    Actions.StartOpenMPDSABlock(DKind, DirName, Actions.getCurScope(), Loc);
    ConsumeAnnotationToken();
    StmtResult AssociatedStmt;
    Actions.ActOnOpenMPRegionStart(DKind, getCurScope());
    AssociatedStmt = (Sema::CompoundScopeRAII(Actions), ParseStatement());
    AssociatedStmt = Actions.ActOnOpenMPRegionEnd(AssociatedStmt, Clauses);

    Directive = Actions.ActOnOpenMPExecutableDirective(
        DKind, DirName, CancelRegion, Clauses, AssociatedStmt.get(), Loc,
        EndLoc);

    // Exit scope.
    Actions.EndOpenMPDSABlock(Directive.get());
    break;
  }
```

In Clang Parser class, Actions is an instance of the class Sema, which implements semantic analysis and AST building for C. Here first we called `Actions.ActOnOpenMPRegionStart`, which is called for initialization of captured region for OpenMP region. Then we parse the statement and notify the end of OpenMP region by calling `Actions.ActOnOpenMPRegionEnd`. In ActOnOpenMPRegionEnd a function getOpenMPCaptureRegions is called which returns the captured region for metadirective.

This function is defined in OpenMPKinds.cpp. We modify this file as
```.term1
vim lib/Basic/OpenMPKinds.cpp +924
```
and add a case in the switch statement of getOpenMPCaptureRegions
```
  case OMPD_metadirective:
    CaptureRegions.push_back(OMPD_metadirective);
    break;
```

Going back to our parsing (ParseOpenMP.cpp), you can see that to create the Directive we used the function `ActOnOpenMPExecutableDirective`. This function (defined in the file `SemaOpenMP.cpp`), tells how to act on an OpenMP executable directive. We will modify this function to handle our case for metadirective. First we need to define how to act on OpenMP metadirective directive. We declare our function `ActOnOpenMPMetaDirective` in the header file `Sema.h` as part of the class Sema and provide its definition in `SemaOpenMP.cpp`. 
```.term1
vim include/clang/Sema/Sema.h +8850
```
The function ActOnOpenMPMetaDirective is called on well-formed '\#pragma omp metadirective' after parsing of the  associated statement.
```
  StmtResult ActOnOpenMPMetaDirective(ArrayRef<OMPClause *> Clauses,
                                      Stmt *AStmt,
                                      SourceLocation StartLoc,
                                      SourceLocation EndLoc);
```
Now let us define the function. For that we open the SemaOpenMP.cpp file
```.term1
vim lib/Sema/SemaOpenMP.cpp +3681
```
In this function we create the OMPMetaDirective.
```
StmtResult Sema::ActOnOpenMPMetaDirective(ArrayRef<OMPClause *> Clauses,
                                          Stmt *AStmt,
                                          SourceLocation StartLoc,
                                          SourceLocation EndLoc) {
  if (!AStmt)
    return StmtError();
 
  auto *CS = cast<CapturedStmt>(AStmt);
  CS->getCapturedDecl()->setNothrow();
 
  setFunctionHasBranchProtectedScope();

  return OMPMetaDirective::Create(Context, StartLoc, EndLoc, Clauses, AStmt,
                                  DSAStack->isCancelRegion());
}
```
Now it is time to call our function from ActOnOpenMPExecutableDirective. Let us go to the switch case in the function ActOnOpenMPExecutableDirective (line 3420). We add our case OMPD_metadirective where we call the ActOnOpenMPMetaDirective function.
```
  case OMPD_metadirective:
    Res = ActOnOpenMPMetaDirective(ClausesWithImplicit, AStmt, StartLoc, EndLoc);
    break;
``` 
We also need to initialize the captured region. For this we add our case in the function ActOnOpenMPRegionStart (line 2483). We will be using the code used to initialize region capture for other directives like parallel or teams,etc.
```
  case OMPD_metadirective:
```


## Step 3 - Building LLVM and testing code
To build `LLVM` go to the `LLVM_BUILD` directory and run make. We are redirecting the output of make to /dev/null to have a clean output. Warning and error messages will still show up if there are any.

```.term1
cd $LLVM_BUILD && make -j8 install > /dev/null
```

You might get a couple of warnings about `enumeration value 'OMPD_metadirective' not handled in switch`. Ignore these warnings for now. we will handle them later. Once the code builds successfully and is installed, its time to test a small program. let us get a new test file

```.term1
wget https://raw.githubusercontent.com/chunhualiao/freecc-examples/master/metadirective/meta.c
```

Now you have a new test file `meta.c` which uses the `metadirective` directive. The content of the file should be as follows:
```
int main()
{
#pragma omp metadirective
    for(int i=0; i<10; i++)
    ;
    return 0;
}
```

Build this file using your Clang compiler.

```.term1
clang -fopenmp -Xclang -ast-dump meta.c
```

you should get an AST tree with OMPMetaDirective Node in it.

<span style="color:green">**Congratulations**</span> you were successfully able to add an AST Node for a new directive to openmp in Clang compiler.

