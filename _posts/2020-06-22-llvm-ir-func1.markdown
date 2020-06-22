---
layout: post
title:  "Creating a function using LLVM IR"
author: "@chunhualiao"
date:   2020-06-22
categories: beginner
tags: [llvm,ir, irbuilder]
---

### **Tips:**

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

## **1. Overview**

The goal of this tutorial is to learn how to use IRBuilder to create various LLVM IR objects. We assume you have already taken the previous more fundamental tutorials:
* [Getting Familar with LLVM IR](http://freecompilercamp.org/llvm-ir)
* [Writing an LLVM Pass](http://freecompilercamp.org/llvm-pass) 
* [Modifying LLVM IR](http://freecompilercamp.org/llvm-ir-mod/) 

## **2. Test Clang/LLVM**

Clang/LLVM has already been installed in the the docker-based online terminal on the right panel.

To test clang, try the following command line:
```.term1
clang --version
```

You should see the version information after the commands above.

## **3. Obtain Example Source Files**

```.term1
git clone https://github.com/freeCompilerCamp/code-for-llvm-tutorials.git
cd code-for-llvm-tutorials/first-function
ls
```

This git repository contains:
* mul_add.c: an example program showing a function to be built,
* tut1.cpp: the LLVM source file to build LLVM IR for the function,
* makefile: makefile with targets to dump LLVM IR and build the program.

### **4. Look Into the Function to be Built**

You can use cat to look into the source file with a simple function:
```.term1
cat mul_add.c
```

You should see the following content: 
```
1 int mul_add(int x, int y, int z) {
2  return x * y + z;
3 }
```

This source file contains a simple mul_add function to perform a mutliply-add operation using three parameters x, y, and z. 
In order to build the LLVM IR representing this function, we can using clang to dump out its LLVM IR as a reference. 

Type the following command line to generate mul_add.ll, the text output of LLVM IR of mul_add.c:
```.term1
make mul_add.ll
```
You should see the following screen output: 
```
clang -S -O3 -emit-llvm mul_add.c
```
The command line above will generate optimized version of LLVM IR, which is easier to understand. 

Now let's look at the text output of the function's LLVM IR:

```.term1
cat mul_add.ll
```

You should see the following screen output (excerpt for the function only): 
```
6 ; Function Attrs: norecurse nounwind readnone uwtable
7 define dso_local i32 @mul_add(i32 %0, i32 %1, i32 %2) local_unnamed_addr #0 {
8   %4 = mul nsw i32 %1, %0
9   %5 = add nsw i32 %4, %2
10   ret i32 %5
11 }
```

If you have finished [Getting Familar with LLVM IR](http://freecompilercamp.org/llvm-ir), you can easily understand the IR above, with the help from [LLVM Language Reference Manual](https://llvm.org/docs/LangRef.html). 
To simplify this tutorial, we will build add and mul instructions, ignoring nsw (“No Signed Wrap”). 
nsw is used to indicate the result value of the instructions is a poison value if signed overflow occurs. 


### **5. Look Into the LLVM Program**

Now let's look at the program building a module and a function.

```.term1
vim tut1.cpp
```

You should see the following screen output (excerpt for the function only): 
```
  1 #include "llvm/Pass.h"
  2 #include "llvm/IR/Function.h"
  3 #include "llvm/Support/raw_ostream.h"
  4 #include "llvm/IR/Module.h"
  5 #include "llvm/IR/PassManager.h"
  6 #include "llvm/IR/CallingConv.h"
  7 #include "llvm/IR/Verifier.h"
  8 #include "llvm/IR/IRPrintingPasses.h"
  9 #include "llvm/IR/IRBuilder.h"
 10 #include "llvm/IR/LegacyPassManager.h"
 11 #include "llvm/Bitcode/BitcodeWriter.h"
 12 #include <stdio.h>
 13 
 14 using namespace llvm;
 15 
 16 Module *makeLLVMModule(LLVMContext &Context);
 17 
 18 int main(int argc, char **argv)
 19 {
 20   LLVMContext Context;
 21   Module *Mod = makeLLVMModule(Context);
 22 
 23   raw_fd_ostream r(fileno(stdout), false);
 24   verifyModule(*Mod, &r);
 25 
 26   //Prints the module IR
 27   ModulePass *m = createPrintModulePass(outs(), "Module IR printer");
 28   legacy::PassManager PM;
 29   PM.add(m);
 30   PM.run(*Mod);
 31 
 32    // Write IR to a bitcode file
 33   FILE* mul_add_file = fopen("mul_add.bc", "w+");
 34   raw_fd_ostream bitcodeWriter(fileno(mul_add_file), true);
 35   WriteBitcodeToFile(*Mod, bitcodeWriter);
 36 
 37   delete Mod;
 38   return 0;
 39 }
 40 
 41 Module *makeLLVMModule(LLVMContext &Context)
 42 {
 43   Module *mod = new Module("mul_add", Context);
 44 
 45   FunctionCallee mul_add_fun = mod->getOrInsertFunction("mul_add",
 46       Type::getInt32Ty(Context),
 47       Type::getInt32Ty(Context),
 48       Type::getInt32Ty(Context),
 49       Type::getInt32Ty(Context));
 50   Function *mul_add = cast<Function> (mul_add_fun.getCallee());
 51 
 52   mul_add->setCallingConv(CallingConv::C);
 53   Function::arg_iterator args = mul_add->arg_begin();
 54   Value *x = args++;
 55   x->setName("x");
 56   Value *y = args++;
 57   y->setName("y");
 58   Value *z = args++;
 59   z->setName("z");
 60 
 61   BasicBlock *block = BasicBlock::Create(Context, "entry", mul_add);
 62   IRBuilder<> builder(block);
 63   Value *tmp = builder.CreateBinOp(Instruction::Mul, x, y, "tmp");
 64   Value *tmp2 = builder.CreateBinOp(Instruction::Add, tmp, z, "tmp2");
 65   builder.CreateRet(tmp2);
 66 
 67   return mod;
 68 }
```
We first declare a makeLLVMModule() function (line 16), which will do the real work of creating the module. 

Line 1 through 12 of the program contains the appropriate LLVM header files. 

Inside of the main function: the first segment is pretty simple: it creates an LLVM “module” (line 21). 
In LLVM, a module represents a single unit of code that is to be processed together. 
A module contains things like global variables, function declarations, and implementations. 


Line 24 runs the LLVM module verifier on our newly created module. While this probably isn’t really necessary for a simple module like this one, it's always a good idea, especially if you’re generating LLVM IR based on some input. The verifier will print an error message if your LLVM module is malformed in any way.

Next, Line 27 through 30 instantiate an LLVM PassManager and run the PrintModulePass on our module. 
LLVM uses an explicit pass infrastructure to manage optimizations and various other things. 
A PassManager, as should be obvious from its name, manages passes: it is responsible for scheduling them, invoking them, and ensuring the proper disposal after we’re done with them. For this example, we’re just using a trivial pass that prints out our module in textual form.

Finally, we write the created module containing the function into a bitcode file named mul_add.bc at line from 33 through 35.

Now onto the interesting part: creating and populating a module inside makeLLVMModule():
* Line 43 creates a new Module object
* Line 45 through 49 construct the function by calling getOrInsertFunction() on our module, passing in the name, return type, and argument types of the function. In the case of our mul_add function, that means one 32-bit integer for the return value and three 32-bit integers for the arguments. 

The details of all classes and member functions of LLVM can be found at https://llvm.org/doxygen/index.html . For example, https://llvm.org/doxygen/classllvm_1_1Module.html lists documentation about LLVM::Module, including getOrInsertFunction().
 
Module::getOrInsertFunction() looks up the specified function in the module symbol table. There are several possibilities:
* If it does not exist, add a prototype for the function and return it.
* Otherwise, if the existing function has the correct prototype, return the existing function.
* Finally, the function exists but has the wrong prototype: return the function with a constantexpr cast to the right prototype.
In all cases, the returned value is a FunctionCallee wrapper around the 'FunctionType T' passed in, as well as a 'Value' either of the Function or the bitcast to the function.
So at line 50, we get the callee of mul_add_fun and cast it to a pointer to Function. 

```
 45   FunctionCallee mul_add_fun = mod->getOrInsertFunction("mul_add",
 46       Type::getInt32Ty(Context),
 47       Type::getInt32Ty(Context),
 48       Type::getInt32Ty(Context),
 49       Type::getInt32Ty(Context));
 50   Function *mul_add = cast<Function> (mul_add_fun.getCallee());
```

Line 52 sets the calling convention for our new function to be the C calling convention. This isn’t strictly necessary, but it ensures that our new function will interoperate properly with C code.

The following code segment gives names to the parameters. This also isn’t strictly necessary (LLVM will generate names for them if you don’t specify them), but it’ll make looking at our output somewhat more pleasant. To name the parameters, we iterate over the arguments of our function and call setName() on them. We’ll also keep the pointer to x, y, and z around, since we’ll need them when we get around to creating instructions.

```
 53   Function::arg_iterator args = mul_add->arg_begin();
 54   Value *x = args++;
 55   x->setName("x");
 56   Value *y = args++;
 57   y->setName("y");
 58   Value *z = args++;
 59   z->setName("z");
```

So far, we have created a function with a parameter list. The next step is to create its body populated with some instructions.
The LLVM IR, being an abstract assembly language, represents control flow using jumps (we call them branches), both conditional and unconditional. The straight-line sequences of code between branches are called basic blocks, or just blocks. To create a body for our function, we fill it with blocks:

We create a new basic block at line 61 by calling its constructor. All we need to tell it is its name and the function to which it belongs. In addition, we’re creating an IRBuilder object, which is a convenience interface for creating instructions and appending them to the end of a block. Instructions can be created through their constructors as well, but some of their interfaces are quite complicated. Unless you need a lot of control, using IRBuilder will make your life simpler.

```
 61   BasicBlock *block = BasicBlock::Create(Context, "entry", mul_add);
 62   IRBuilder<> builder(block);
 63   Value *tmp = builder.CreateBinOp(Instruction::Mul, x, y, "tmp");
 64   Value *tmp2 = builder.CreateBinOp(Instruction::Add, tmp, z, "tmp2");
 65   builder.CreateRet(tmp2);
```

The final step in creating our function is to create the instructions that make it up. Our mul_add function is composed of just three instructions: a multiply, an add, and a return. IRBuilder gives us a simple interface for constructing these instructions and appending them to the “entry” block. Each of the calls to IRBuilder returns a Value* that represents the value yielded by the instruction. You’ll also notice that, above, x, y, and z are also Value*'s, so it's clear that instructions operate on Value*'s.

### **6. Build and Test the Program**

This tutorial's sourcetree lives independent from LLVM.  
It uses a makefile to build the executable, using an installed copy of LLVM. 
To build the executable, type the following command line:
```.term1
make tut1
```

You should see the following output:
```
clang++ -g tut1.cpp `llvm-config --cxxflags --ldflags --libs core BitWriter --system-libs` -lpthread -o tut1
```

clang++ is used to compile tut1.cpp, using cxxflags and ldflags exposed by llvm-config. Additionally, core and BitWriter libraries are used since the code also uses BitWriter to write out the created module into a bitcode file (linei 33-35). Pthreads is also needed for BitWriter.

Finally, we run the program:
```.term1
./tut1
```

You should see the following content:
```
Module IR printer
; ModuleID = 'mul_add'
source_filename = "mul_add"

define i32 @mul_add(i32 %x, i32 %y, i32 %z) {
entry:
  %tmp = mul i32 %x, %y
  %tmp2 = add i32 %tmp, %z
  ret i32 %tmp2
}
```

The module IR is extactly what we want to create. Additionally, there is a mul_add.bc file created under the current path.
You can use llvm-dis to convert it to a text file and check its content. It should be the same as the text output we just saw above.


### **7. References**

This tutorial is based on the content from https://releases.llvm.org/2.6/docs/tutorial/JITTutorial1.html .

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-06-22-llvm-ir-func1.markdown)
