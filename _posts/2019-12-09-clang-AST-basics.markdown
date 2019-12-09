---
layout: post
title:  "Clang -- Basics of AST manipulation"
author: "@peihunglin"
date:   2019-12-09
categories: beginner
tags: [clang,preprocessor,compiler,ast,traversal,lowering]
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
This is a short introduction to the basics of Clang AST manipulation following [`Clang documentation: HOW TO WRITE RECURSIVEASTVISITOR BASED ASTFRONTENDACTIONS.`](https://clang.llvm.org/docs/RAVFrontendAction.html)

---

## **How to write RecursiveASTVisitor based ASTFrontendActions**
In this tutorial you will learn how to create a FrontendAction that uses a RecursiveASTVisitor to find CXXRecordDecl AST nodes with a specified name using the following features:
1. Creating a FrontendAction
2. Creating an ASTConsumer
3. Using the RecursiveASTVisitor
4. Accessing the SourceManager and ASTContext

At the end of these 4 stages we should have a single executable file. Given below are the description of these 4 stages that happens using Clang compier, regardless of the Operating System.

### **A.1 Creating a FrontendAction**
When writing a clang based tool like a Clang Plugin or a standalone tool based on LibTooling, the common entry point is the FrontendAction. FrontendAction is an interface that allows execution of user specific actions as part of the compilation. To run tools over the AST clang provides the convenience interface ASTFrontendAction, which takes care of executing the action. The only part left is to implement the CreateASTConsumer method that returns an ASTConsumer per translation unit.

Example of the FrontendAction class:
```
class FindNamedClassAction : public clang::ASTFrontendAction {
public:
  virtual std::unique_ptr<clang::ASTConsumer> CreateASTConsumer(
    clang::CompilerInstance &Compiler, llvm::StringRef InFile) {
    return std::unique_ptr<clang::ASTConsumer>(
        new FindNamedClassConsumer);
  }
};
```

### **A.2 Creating an ASTConsumer**
ASTConsumer is an interface used to write generic actions on an AST, regardless of how the AST was produced. ASTConsumer provides many different entry points, but for our use case the only one needed is HandleTranslationUnit, which is called with the ASTContext for the translation unit.

Example of the ASTConsumer class:
```
class FindNamedClassConsumer : public clang::ASTConsumer {
public:
  virtual void HandleTranslationUnit(clang::ASTContext &Context) {
    // Traversing the translation unit decl via a RecursiveASTVisitor
    // will visit all nodes in the AST.
    Visitor.TraverseDecl(Context.getTranslationUnitDecl());
  }
private:
  // A RecursiveASTVisitor implementation.
  FindNamedClassVisitor Visitor;
};
```

### **A.3 Using the RecursiveASTVisitor**
Now that everything is hooked up, the next step is to implement a RecursiveASTVisitor to extract the relevant information from the AST.

The RecursiveASTVisitor provides hooks of the form bool VisitNodeType(NodeType \*) for most AST nodes; the exception are TypeLoc nodes, which are passed by-value. We only need to implement the methods for the relevant node types.

Let’s start by writing a RecursiveASTVisitor that visits all CXXRecordDecl’s.
```
class FindNamedClassVisitor
  : public RecursiveASTVisitor<FindNamedClassVisitor> {
public:
  bool VisitCXXRecordDecl(CXXRecordDecl *Declaration) {
    // For debugging, dumping the AST nodes will show which nodes are already
    // being visited.
    Declaration->dump();

    // The return value indicates whether we want the visitation to proceed.
    // Return false to stop the traversal of the AST.
    return true;
  }
};
``` 
In the methods of our RecursiveASTVisitor we can now use the full power of the Clang AST to drill through to the parts that are interesting for us. For example, to find all class declaration with a certain name, we can check for a specific qualified name:
```
bool VisitCXXRecordDecl(CXXRecordDecl *Declaration) {
  if (Declaration->getQualifiedNameAsString() == "n::m::C")
    Declaration->dump();
  return true;
}
```

## ** Putting all together ** 
Now we can combine all of the above into a small example program:

```.term1
cd $LLVM_SRC/tools/clang/tools
```

```.term1
mkdir FindClassDecls && cd FindClassDecls 
```

```.term1
cat << EOF > FindClassDecls.cpp
#include "clang/AST/ASTConsumer.h"
#include "clang/AST/RecursiveASTVisitor.h"
#include "clang/Frontend/CompilerInstance.h"
#include "clang/Frontend/FrontendAction.h"
#include "clang/Tooling/Tooling.h"

using namespace clang;

class FindNamedClassVisitor
  : public RecursiveASTVisitor<FindNamedClassVisitor> {
public:
  explicit FindNamedClassVisitor(ASTContext *Context)
    : Context(Context) {}

  bool VisitCXXRecordDecl(CXXRecordDecl *Declaration) {
    if (Declaration->getQualifiedNameAsString() == "n::m::C") {
      FullSourceLoc FullLocation = Context->getFullLoc(Declaration->getBeginLoc());
      if (FullLocation.isValid())
        llvm::outs() << "Found declaration at "
                     << FullLocation.getSpellingLineNumber() << ":"
                     << FullLocation.getSpellingColumnNumber() << "\n";
    }
    return true;
  }

private:
  ASTContext *Context;
};

class FindNamedClassConsumer : public clang::ASTConsumer {
public:
  explicit FindNamedClassConsumer(ASTContext *Context)
    : Visitor(Context) {}

  virtual void HandleTranslationUnit(clang::ASTContext &Context) {
    Visitor.TraverseDecl(Context.getTranslationUnitDecl());
  }
private:
  FindNamedClassVisitor Visitor;
};

class FindNamedClassAction : public clang::ASTFrontendAction {
public:
  virtual std::unique_ptr<clang::ASTConsumer> CreateASTConsumer(
    clang::CompilerInstance &Compiler, llvm::StringRef InFile) {
    return std::unique_ptr<clang::ASTConsumer>(
        new FindNamedClassConsumer(&Compiler.getASTContext()));
  }
};

int main(int argc, char **argv) {
  if (argc > 1) {
    FindNamedClassAction *FNC = new FindNamedClassAction();
    clang::tooling::runToolOnCode(FNC, argv[1]);
  }
}
EOF
```

Adding CMakefile
```.term1
cat << EOF > CMakeLists.txt
set (LLVM_LINK_COMPONENTS Support)

add_clang_tool(find-class-decls FindClassDecls.cpp_

target_link_libraries(find-class-decls
  PRIVATE
  clangAST
  clangBasic
  clangDriver
  clangFrontend
  clangRewriteFrontend
  clangSerialization
  clangTooling
  }

install(TARGETS find-class-decls RUNTIME DESTINATION bin)
EOF
```

```.term1
cd $LLVM_BUILD && make -j8 install > /dev/null
```

```.term1
./bin/find-class-decls "namespace n { namespace m { class C {}; } }"
```


<span style="color:green">**Congratulations**</span> you have successfully completed the Clang basics of compilation tutorial. 
Now you can start with the next step of modifying the Clang compiler.
The first tutorial to follow in that is - [Adding a New Directive in OpenMP (Clang)](http://www.freecompilercamp.org/new-directive-llvm).
