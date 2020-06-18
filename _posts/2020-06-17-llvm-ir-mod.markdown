---
layout: post
title:  "Modifying LLVM IR"
author: "@chunhualiao"
date:   2020-06-17
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

The goal of this tutorial is to learn how to use IRBuilder to modify LLVM IR using a simple example program. We assume you have already took the previous more fundamental tutorials:
* [Getting Familar with LLVM IR](http://freecompilercamp.org/llvm-ir)
* [Writing an LLVM Pass](http://freecompilercamp.org/llvm-pass) 

## **2. Test Clang and LLVM**

Clang and LLVM have already been installed in the the docker-based online terminal on the right panel.

To test clang and llvm's optimizer, try the following command lines:
```.term1
clang --version
```
and
```.term1
opt --version
```

You should see the version information after the commands above.

## **3. Obtain Example Source Files**

```.term1
git clone --single-branch --branch mutate https://github.com/chunhualiao/llvm-pass-skeleton.git
cd llvm-pass-skeleton/
```

This git repository contains:
* An example skeleton LLVM pass to find any binary operators and replace them with a multiply operator
* CMakeList.text to build the program
* Example programs as the input of the LLVM pass

### **4. Look Into the Source File**

You can use vim to look into the source 
```.term1
vim skeleton/Skeleton.cpp
```

You should see the following content: 
```
  1 #include "llvm/Pass.h"
  2 #include "llvm/IR/Function.h"
  3 #include "llvm/Support/raw_ostream.h"
  4 #include "llvm/IR/LegacyPassManager.h"
  5 #include "llvm/IR/InstrTypes.h"
  6 #include "llvm/Transforms/IPO/PassManagerBuilder.h"
  7 #include "llvm/IR/IRBuilder.h"
  8 #include "llvm/Transforms/Utils/BasicBlockUtils.h"
  9 using namespace llvm;
 10 
 11 namespace {
 12   struct SkeletonPass : public FunctionPass {
 13     static char ID;
 14     SkeletonPass() : FunctionPass(ID) {}
 15 
 16     virtual bool runOnFunction(Function &F) {
 17       for (auto &B : F) {
 18         for (auto &I : B) {
 19           if (auto *op = dyn_cast<BinaryOperator>(&I)) {
 20             // Insert at the point where the instruction `op` appears.
 21             IRBuilder<> builder(op);
 22 
 23             // Make a multiply with the same operands as `op`.
 24             Value *lhs = op->getOperand(0);
 25             Value *rhs = op->getOperand(1);
 26             Value *mul = builder.CreateMul(lhs, rhs);
 27 
 28             // Everywhere the old instruction was used as an operand, use our
 29             // new multiply instruction instead.
 30             for (auto &U : op->uses()) {
 31               User *user = U.getUser();  // A User is anything with operands.
 32               user->setOperand(U.getOperandNo(), mul);
 33             }
 34 // TODO: remove the old instruction, may need to consider the iterator invalidation problem. omitted for brevity  
 35             // We modified the code.
 36             return true;
 37           }
 38         }
 39       }
 40 
 41       return false;
 42     }
 43   };
 44 }
 45 
 46 char SkeletonPass::ID = 0;
 47 
 48 // Automatically enable the pass.
 49 // http://adriansampson.net/blog/clangpass.html
 50 static void registerSkeletonPass(const PassManagerBuilder &,
 51                          legacy::PassManagerBase &PM) {
 52   PM.add(new SkeletonPass());
 53 }
 54 static RegisterStandardPasses
 55   RegisterMyPass(PassManagerBuilder::EP_EarlyAsPossible,
 56                  registerSkeletonPass);
```
This program uses the FunctionPass as the base class to get access to its member function runOnFunction() as shown in line 16.
Inside of this function, a nested loop is used to iterate over all instructions within all basic blocks (line 17 and 18).

Line 19 uses dynamic casting to check if an instruction is a binary operator. If yes, IRBuilder is used to specify the insersion point (the binary instruction) and to create a multiply instruction using the existing two operands (line 21 through 26).

Once the new instruction is created. Another loop (line 30) is used to find all places using the original binary instruction. 
And for each user, we reset its operand to the newly created instruction (line 32).   

For brevilty, the program does not implement the removal of the replaced binary operation. 

### **5. Build the LLVM Pass**

To give it a try:
```.term1
mkdir build
cd build/
cmake ../.
make
```

You should see the following screen output 
```
Scanning dependencies of target SkeletonPass
[ 50%] Building CXX object skeleton/CMakeFiles/SkeletonPass.dir/Skeleton.cpp.o
[100%] Linking CXX shared module libSkeletonPass.so
[100%] Built target SkeletonPass
```

### **6. Run the LLVM Pass**

We first test the input program to see its behavior before the LLVM IR modification.

```.term1
cd ..
cat something.c
```

You should see the following content: 
```
1 #include <stdio.h>
2 int main(int argc, const char** argv) {
3    int num=10;
4    printf("%i\n", num + 2);
5    return 0;
6 }
```

Using GCC, we compile and run it.
```.term1
gcc something.c
./a.out
```

The execution result should be 12 since line 4 of the code prints out num (10) +2. 

We now using clang hooked with the LLVM pass we just built.

```.term1
clang -Xclang -load -Xclang build/skeleton/libSkeletonPass.so something.c
./a.out
```

Now the execution result should be 20 since the LLVM pass replaces the binary operator within (10+2) with * , resulting in (10*2).

### **7. References**
The following links are useful for further information:
* This tutorial is based on the content from http://www.cs.cornell.edu/~asampson/blog/llvm.html .

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-06-17-llvm-ir-mod.markdown)
