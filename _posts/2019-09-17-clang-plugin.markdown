---
layout: post
title:  "Clang Plugin Example"
author: "@alokmishra.besu"
date:   2019-09-17
categories: beginner
tags: [clang,ast,traversal,plugin,RecursiveASTVisitor]
---

## **Tips:**

Code snippets are shown in one of three ways throughout this environment:

1. Code that looks like `this` is sample code snippets that is usually part of an explanation.
2. Code that appears in box like the one below can be clicked on and it will automatically be typed in to the appropriate terminal window:
```.term1
vim readme.txt
```

3. Code appearing in windows like the one below is code that you should type in yourself.
Usually there will be a unique ID or other bit your need to enter which we cannot supply.
Items appearing in <> are the pieces you should substitute based on the instructions.
```
Add your name here - <name>
```

## **Features**
This is a tutorial about how to write a short plugin in Clang which modify the source code as required.

---

## **A. Overview**
Clang Plugins make it possible to run extra user defined actions during a compilation.
Plugins are dynamic libraries that are loaded at runtime by the compiler, and they're easy to integrate into your build environment.

Canonical examples of when to use Clang Plugins:
- special lint-style warnings or errors for your project
- creating additional build artifacts from a single compile step

Use Clang Plugins when you:
- need your tool to rerun if any of the dependencies change
- want your tool to make or break a build
- need full control over the Clang AST

Do not use Clang Plugins when you…:
- want to run tools outside of your build environment
- want full control on how Clang is set up, including mapping of in-memory virtual files
- need to run over a specific subset of files in your project which is not necessarily related to any changes which would trigger rebuilds

## **B. Writing a simple plugin**
Let's say that you want to analyze a simple C file. Let us create a C file, saxpy.c, as follows:
```.term1
cat << EOF > saxpy.c
int func1(int x, int y) { return x+y; }

int func2(int x, int y) { return x*y; }

int saxpy(int a, int x, int y) { return func1(func2(a,x),y); }
EOF
```

Suppose we want to do some simple fixes on this C file. 
We would like to change the name of *func1* to *add* and func2 to *multiply*. 
Then we would also like to change the function calls of *func1* and *func2* to *add* and *multiply* respectively.
We can write a plugin which will parse through the AST and make the above changes to the file.

First, we need to set up some structure. The first question that arises is -- **Where to write the plugin?**
Clang plugin can be written out of source tree or within the source.
In this tutorial we will write our plugin within the Clang source code.
In this sandbox environment the Clang source is available at `$LLVM_SRC/tools/clang`.
If you are running on your personal computer find the location of the source and go there.
Inside the clang source we have the `examples` directory.
We have already built our LLVM source to include the clang example directory.
We will add our code into this directory.
```.term1
cd $LLVM_SRC/tools/clang/examples
```

Let us create a new directory named RenameFunctions. This is where our plugin will reside.
```.term1
mkdir RenameFunctions
cd RenameFunctions
```

The files for this plugin are available in the freecc-examples github repository.
`We recommed you to try out the tutorial yourself before downloading the code.`
If needed you may download it from the repository using the following commands:
```.term1
wget https://raw.githubusercontent.com/chunhualiao/freecc-examples/master/plugin/RenameFunctions/RenameFunctions.cpp
wget https://raw.githubusercontent.com/chunhualiao/freecc-examples/master/plugin/RenameFunctions/CMakeLists.txt
```
`If you downloaded the files, skip executing any command in Section B0-B.5. and skip to` [Section C](#building).
You may still read this section to have an understanding of the plugin.

To write a plugin we need to write the following codes:
1. A class which creates a PluginASTAction - PluginRenameAction
2. A class which creates an ASTConsumer - RenameASTConsumer
3. A class which create a RecursiveASTVisitor - RenameVisitor
4. Register the plugin
5. Create the CMakeLists.txt file
6. Include plugin in build system and build the plugin
7. Running the plugin example

### **B.0 Initialize the file**
Fist create a file named `RenameFunctions.cpp`. This is where we will write the code for our plugin.
```.term1
vi RenameFunctions.cpp
```

Instantiate this file with some header files and namespace information. These are required for the code and are self explanatory.
```c++
#include "clang/Driver/Options.h"
#include "clang/AST/AST.h"
#include "clang/AST/ASTContext.h"
#include "clang/AST/ASTConsumer.h"
#include "clang/AST/RecursiveASTVisitor.h"
#include "clang/Frontend/ASTConsumers.h"
#include "clang/Frontend/FrontendActions.h"
#include "clang/Frontend/CompilerInstance.h"
#include "clang/Frontend/FrontendPluginRegistry.h"
#include "clang/Rewrite/Core/Rewriter.h"

using namespace std;
using namespace clang;
using namespace llvm;
```

We will also create an instance of the Rewriter class which will be used to edit the original source code and in the end print out the code to the command prompt. Since this instance will be accessed by multiple classes we will make it gobal. So right after the namespace information declare an instance of `Rewriter` on line 16.

```c++
Rewriter rewriter;
```

### **B.1 Create a PluginASTAction**
First let's create our own custom PluginASTAction, which is merely an abstract base class to use for AST consumer-based plugins.
It acts as an entry point from which we can invoke our ASTConsumer.
As the name implies, a PluginASTAction should only be used within the context of a Clang Plugin.

We will create a class named PluginRenameAction (line 18).
```c++
class PluginRenameAction : public PluginASTAction {
protected:
    unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &CI, StringRef file) {
        return make_unique<RenameASTConsumer>(&CI);
    }
 
    bool ParseArgs(const CompilerInstance &CI, const vector<string> &args) {
        return true;
    }
};
```

In this class we need to define 2 functions:
1. *CreateASTConsumer* -- which is called by clang when it invokes our plugin. This is the place from where we call and return our custom AST Consumer (*RenameASTConsumer*).
2. *ParseArgs* -- which is needed to parse custom command line arguments. In this tutorial we are not looking at any command line arguments.

### **B.2 Creating an ASTConsumer**
The ASTConsumer “consumes” (reads) the AST produced by the Clang parser.
Go through the documentation of [ASTComsumer](https://clang.llvm.org/doxygen/classclang_1_1ASTConsumer.html) to see what all functions it provides.
You can override however many functions you wish, so that your code will be called when a certain type of AST item has been parsed.
First, let's override `HandleTopLevelDecl()`, which will be called whenever Clang parses a new set of top-level declarations (such as global variables, function definitions, etc.).

However we might **`run into a problem`** with HandleTopLevelDecl.
Overriding HandleTopLevelDecl means that your code in that function will be immediately called each time a new Decl is parsed in the source, not after the entire source file has been parsed.
This creates a problem because, from the parser's point of view, when *func1* is being visited, it is completely unaware that another function *saxpy* exists.
This means you can't access or reason about functions defined after the function you're currently analyzing.

Luckily, the ASTConsumer class has a better function to override, HandleTranslationUnit, which is called only after the entire source file is parsed.
In this case, a translation unit effectively represents an entire source file.
An `ASTContext` class is used to represent the AST for that source file, and it has a ton of useful members (check out its documentation [here](https://clang.llvm.org/doxygen/classclang_1_1ASTContext.html)!)

Since this function is called by the PluginRenameAction class, let us put its definition before that. 
So add the following code on line 18.

```c++
class RenameASTConsumer : public ASTConsumer {
private:
    RenameVisitor *visitor; // doesn't have to be private

    // Function to get the base name of the file provided by path
    string basename(std::string path) {
        return std::string( std::find_if(path.rbegin(), path.rend(), MatchPathSeparator()).base(), path.end());
    }

    // Used by std::find_if
    struct MatchPathSeparator
    {
        bool operator()(char ch) const {
            return ch == '/';
        }
    };
 
public:
    explicit RenameASTConsumer(CompilerInstance *CI)
        : visitor(new RenameVisitor(CI)) // initialize the visitor
        { }
 
    virtual void HandleTranslationUnit(ASTContext &Context) {
        visitor->TraverseDecl(Context.getTranslationUnitDecl());

        // Create an output file to write the updated code
        FileID id = rewriter.getSourceMgr().getMainFileID();
        string filename = "/tmp/" + basename(rewriter.getSourceMgr().getFilename(rewriter.getSourceMgr().getLocForStartOfFile(id)).str());
        std::error_code OutErrorInfo;
        std::error_code ok;
        llvm::raw_fd_ostream outFile(llvm::StringRef(filename),
            OutErrorInfo, llvm::sys::fs::F_None);
        if (OutErrorInfo == ok) {
            const RewriteBuffer *RewriteBuf = rewriter.getRewriteBufferFor(id);
            outFile << std::string(RewriteBuf->begin(), RewriteBuf->end());
            errs() << "Output file created - " << filename << "\n";
        } else {
            llvm::errs() << "Could not create file\n";
        }
    }
};
```

In this class we override 2 functions:
1. The *RenameASTConsumer* constructor -- which we override in order to pass the [CompilerInstance](https://clang.llvm.org/doxygen/classclang_1_1CompilerInstance.html) instance to our RenameVisitor object.
2. *HandleTranslationUnit* -- because we need to update after parsing the whole file. 
We use the ASTContext to get the TranslationUnitDecl, which is a single Decl that collectively represents the entire source file.
Once we are done traversing the AST we print out the buffer in our Rewriter.

For the most part, you should use `HandleTranslationUnit`, especially when you pair it with a RecursiveASTVisitor, like we are going to do below.

### **B.3 Creating a RecursiveASTVisitor**
At long last we're ready to get some real work done.
The previous two sections were just to set up infrastructure.
The `RecursiveASTVisitor` is a fascinating class with more to it than meets the eye.
Go through its official documentation [here](http://clang.llvm.org/doxygen/classclang_1_1RecursiveASTVisitor.html).
It allows you to Visit any type of AST node, such as `FunctionDecl` and `Stmt`, simply by overriding a function with that name, e.g., `VisitFunctionDecl` and `VisitStmt`.
This same format works with any AST class. 
Clang also offers a brief [official tutorial](http://clang.llvm.org/docs/RAVFrontendAction.html) on this which you should check out once.

For such *Visit* functions, you must return true to continue traversing the AST (examining other nodes) and return false to halt the traversal entirely and essentially exit Clang.
You shouldn’t ever call any of the *Visit* functions directly; instead call TraverseDecl (like we did in our RenameASTConsumer above), which will call the correct *Visit* function behind the scenes.

Based on our objective of rewriting function definitions and statements, we only need to override `VisitFunctionDecl` and `VisitStmt`.
Again this class is referenced by the AST Consumer class (`RenameASTConsumer`).
So let us define it before that class (line 18).

```c++
class RenameVisitor : public RecursiveASTVisitor<RenameVisitor> {
private:
    ASTContext *astContext; // used for getting additional AST info
 
public:
    explicit RenameVisitor(CompilerInstance *CI)
        : astContext(&(CI->getASTContext())) // initialize private members
    {
        rewriter.setSourceMgr(astContext->getSourceManager(),
            astContext->getLangOpts());
    }
 
    virtual bool VisitFunctionDecl(FunctionDecl *func) {
        string funcName = func->getNameInfo().getName().getAsString();
        if (funcName == "func1") {
            rewriter.ReplaceText(func->getLocation(), funcName.length(), "add");
        }
        if (funcName == "func2") {
            rewriter.ReplaceText(func->getLocation(), funcName.length(), "multiply");
        }

        return true;
    }     
     
    virtual bool VisitStmt(Stmt *st) {
        if (CallExpr *call = dyn_cast<CallExpr>(st)) {
            string callName = call->getDirectCallee()->getNameInfo().getName().getAsString();
            if(callName == "func1") {
                rewriter.ReplaceText(call->getBeginLoc(), callName.length(), "add");
            } else if(callName == "func2") {
                rewriter.ReplaceText(call->getBeginLoc(), callName.length(), "multiply");
            }
        }
        return true;
    }
};
```

The above code first uses our Rewriter class, which lets you make textual changes to the source code.
It is commonly used for refactoring or making small code changes.
We also used it at the end of our *PluginASTAction's* CreateASTConsumer function to print out the full modified source code.

Using Rewriter means that you need to find the correct SourceLocation to insert/replace text.
Understanding which location to choose (getLocation(), getLocStart(), etc) can be difficult, so I’ve explained several common types of location getters in this post.

Also, note the use of dyn_cast to check whether the Stmt st is a ReturnStmt or a CallExpr.
Click [here](http://llvm.org/docs/ProgrammersManual.html#the-isa-cast-and-dyn-cast-templates) to read more about dyn_cast.

### **B.4 Register the plugin**
We also need to register our Plugin so that Clang can call it during the build process. This is simple to do:
```c++
static FrontendPluginRegistry::Add<PluginRenameAction>
    X("-rename-plugin", "simple Plugin example");
```
This is standard procedure for all Clang Plugins and should go at the bottom of the file.
Registering your Plugin requires two inputs:
1. A command-line argument string that will be used to invoke your Plugin. Above, we used `"-rename-plugin"`, so we can invoke our Plugin with *"-rename-plugin"* later.
2. A description of what your Plugin does ("simple Plugin example").

### **B.5 Create the CMakeLists.txt file**
CMake is a meta build system that uses scripts called CMakeLists.txt to generate build files for a specific environment.
We are using CMake to build LLVM,so to build this plugin we need to create the CMakeLists.txt file as follows:
```.term1
cat << EOF > CMakeLists.txt
add_llvm_library(RenameFunctions MODULE RenameFunctions.cpp PLUGIN_TOOL clang)

if(LLVM_ENABLE_PLUGINS AND (WIN32 OR CYGWIN))
  target_link_libraries(RenameFunctions PRIVATE
    clangAST
    clangBasic
    clangFrontend
    LLVMSupport
    )
endif()
EOF
```
Here we are instructing the build system to create a library RenameFunctions for the clang plugin. This is the library that we will link our plugin.


## <a name="building"></a> **C Building and Testing**

### **C.1 Include plugin in build**
Before we build we need to include our plugin to be built by LLVM. For that we will add a subdirectory into the CMakeLists.txt file of the example directory.
```.term1
echo "add_subdirectory(RenameFunctions)" >> ../CMakeLists.txt
```
This will make sure that CMake considers our plugin for build.

### **C.2 Build**
Next step is to build our plugin. Since we modified the clang source code, this step is easier. We just need to go to the location of our LVM_BUILD and run the make command. This is recognize that we have added a new directory for build and will build our plugin. Here we are running the make install command to finally install our library into the location where LLVM is installed.
```.term1
cd $LLVM_BUILD
make -j8 install > /dev/null
```

### **C.3 Testing**
Next comes the task to test our plugin. Remember we created a file in the beginning called saxpy.c. Lets check that file again.
```.term1
cd
cat saxpy.c
```
Now this file contains the functions named *func1* and *func2*. We our plugin is written correctly it will rename the functions as *add* and *multiply* respectively. To test our plugin we will run the following command:
```.term1
clang -Xclang -load -Xclang RenameFunctions.so -Xclang -plugin -Xclang -rename-plugin -c saxpy.c
```
To run a plugin, the dynamic library containing the plugin registry must be loaded via the *-load* command line option. 
This will load all plugins that are registered, and you can select the plugins to run by specifying the *-plugin* option.
Here we are asking clang to `load` the library `RenameFunctions.so` and use the `plugin` named `-rename-plugin`

**So what are all these Xclang in the command?**

Usually compilers consist of compiler drivers, which knows how to execute compiler itself, assembler, linker, etc. and compiler itself which just takes the source code (sometimes already preprocessed) and emit assembler/object code. 
In clang the *-cc1* argument indicates that the compiler front-end is to be used, and not the driver. 
The clang -cc1 functionality implements the core compiler functionality.
For all arguments to reach clang's cc1 process, clang provides an option to prefix all arguments with Xclang.
If we ignore the Xclangs the command becomes much clear:
```
clang -load RenameFunctions.so -plugin -rename-plugin -c saxpy.c
```

Once your build is successful it will say
```
Output file created - /tmp/saxpy.c
```

Let us print out the output file to check if the plugin works
```.term1
cat /tmp/saxpy.c
```

<span style="color:green">**Congratulations**</span> you were successfully able to create a new plugin in Clang.
