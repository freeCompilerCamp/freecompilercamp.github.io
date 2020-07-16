---
layout: post
title: "AST Modification - Functions and Function Calls"
author: "@vec4, @ouankou"
date: 2020-07-09
categories: intermediate
tags: [rose, ast-modification]
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

## Features ##
This is part two of AST modification. In this tutorial, we look at inserting functions and function calls into source code.

## A. Functions ##
Here, we will take a look at a translator that shows how to add a function at the top of a global scope in a file.

The source can be viewed with the command below.

```.term1
cat -n ${ROSE_SRC}/tutorial/addFunctionDeclaration2.C
```

<details class="code-collapsible">
<summary>Click to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// This example shows how to construct a defining function (with a function body)
// using high level AST construction interfaces.
//
#include "rose.h"
using namespace SageBuilder;
using namespace SageInterface;

class SimpleInstrumentation : public SgSimpleProcessing
   {
     public:
          void visit ( SgNode* astNode );
   };

void
SimpleInstrumentation::visit ( SgNode* astNode )
   {
     SgGlobal* globalScope = isSgGlobal(astNode);
     if (globalScope != NULL)
        {
       // ********************************************************************
       // Create a parameter list with a parameter
       // ********************************************************************
          SgName var1_name = "var_name";
          SgReferenceType *ref_type = buildReferenceType(buildIntType());
          SgInitializedName *var1_init_name = buildInitializedName(var1_name, ref_type);
          SgFunctionParameterList* parameterList = buildFunctionParameterList();
          appendArg(parameterList,var1_init_name);

       // *****************************************************
       // Create a defining functionDeclaration (with a function body)
       // *****************************************************
          SgName func_name                    = "my_function";
          SgFunctionDeclaration * func        = buildDefiningFunctionDeclaration
                        (func_name, buildIntType(), parameterList,globalScope);
          SgBasicBlock*  func_body    = func->get_definition()->get_body();

       // ********************************************************
       // Insert a statement in the function body
       // *******************************************************

          SgVarRefExp *var_ref = buildVarRefExp(var1_name,func_body);
          SgPlusPlusOp *pp_expression = buildPlusPlusOp(var_ref);
          SgExprStatement* new_stmt = buildExprStatement(pp_expression);

       // insert a statement into the function body
          prependStatement(new_stmt,func_body);
          prependStatement(func,globalScope);

        }
   }

int
main ( int argc, char * argv[] )
   {
  // Initialize and check compatibility. See Rose::initialize
     ROSE_INITIALIZE;

     SgProject* project = frontend(argc,argv);
     ROSE_ASSERT(project != NULL);

     SimpleInstrumentation treeTraversal;
     treeTraversal.traverseInputFiles ( project, preorder );

     AstTests::runAllTests(project);
     return backend(project);
   }
{% endhighlight %}
</figure>

</details>

Let's first focus on lines 20-35 that build up our function declaration and its parameters:

<figure class="customlines-container">
{% highlight c++ %}
20  // ********************************************************************
21  // Create a parameter list with a parameter
22  // ********************************************************************
23  SgName var1_name = "var_name";
24  SgReferenceType *ref_type = buildReferenceType(buildIntType());
25  SgInitializedName *var1_init_name = buildInitializedName(var1_name, ref_type);
26  SgFunctionParameterList* parameterList = buildFunctionParameterList();
27  appendArg(parameterList,var1_init_name);
28
29  // *****************************************************
30  // Create a defining functionDeclaration (with a function body)
31  // *****************************************************
32  SgName func_name                    = "my_function";
33  SgFunctionDeclaration * func        = buildDefiningFunctionDeclaration
34    (func_name, buildIntType(), parameterList,globalScope);
35  SgBasicBlock*  func_body    = func->get_definition()->get_body();
{% endhighlight %}
</figure>

Just like before, we need to build up the function definition with various `buildXXX()` function calls. First, we construct the parameter list on lines 20-27. Here, our function has a single reference parameter: `int &var_name`. The code is quite self-explanatory, but do note that we must create an `SgInitializedName` for the variable and create the parameter list with `buildFunctionParameterList()`.

Next, we create a function declaration (lines 29-35). Again, the code is self-explanatory; take note, however, that we provide the return type (`int`) of the function in the `buildDefiningFunction()` function and provide it the parameter list. We also specify that this function is of global scope as an explicit scope parameter. Note, also, that we obtain a pointer to the function body which will allow us to add statements to the body.

Let's now look at the creation of the function body n lines 37-47:

<figure class="customlines-container">
{% highlight c++ %}
37  // ********************************************************
38  // Insert a statement in the function body
39  // *******************************************************
40
41  SgVarRefExp *var_ref = buildVarRefExp(var1_name,func_body);
42  SgPlusPlusOp *pp_expression = buildPlusPlusOp(var_ref);
43  SgExprStatement* new_stmt = buildExprStatement(pp_expression);
44
45  // insert a statement into the function body
46  prependStatement(new_stmt,func_body);
47  prependStatement(func,globalScope);
{% endhighlight %}
</figure>

In this case, we are adding the statement

```c++
++var_name;
```

We again use the `buildVarRefExp()` function to obtain the initialized name corresponding to the `var_name` variable. Once we have done this, we use `buildPlusPlusOp()` to build the `++var_name` expression, followed by building the statement containing the expression on line 43. Finally, lines 46-47 insert the statement into the body.

The resulting function we have constructed is below.

```c++
int my_function(int &var_name) {
  ++var_name;
}
```

Let's build our tool.

```.term1
cd ${ROSE_BUILD}/tutorial
make addFunctionDeclaration2
```

We will run our translator with the following input code.

<figure class="lineno-container">
{% highlight cpp linenos %}
int main() {
  for (int i = 0; i < 4; i++) {
    int x;
  }

  return 0;
}
{% endhighlight %}
</figure>

We expect that the function we have constructed will be inserted to the top of this source code (the global scope). Let's verify this:

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-advanced-ast-modification/function_input.cxx
./addFunctionDeclaration2 function_input.cxx
cat -n rose_function_input.cxx
```

<details class="code-collapsible">
<summary>Click to view output code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}

int my_function(int &var_name)
{
  ++var_name;
}

int main()
{
  for (int i = 0; i < 4; i++) {
    int x;
  }
  return 0;
}
{% endhighlight %}
</figure>

</details>

The translator works as expected.

## B. Function Calls ##
In this section, we will learn how to insert a dummy function call to the input. This is a common task for an instrumentation translator.

Let's look at the source code for this translator.

```.term1
cat -n ${ROSE_SRC}/tutorial/addFunctionCalls.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
/*! \brief  test SageBuilder::buildFunctionCallStmt()
*   It can
*   - build a function call statement when the function is already declared.
*   - build a function call statement without previous declaration, a header is inserted first
*/
#include "rose.h"
#include <iostream>
using namespace std;
using namespace SageInterface;
using namespace SageBuilder;

int main (int argc, char *argv[])
{
  SgProject *project = frontend (argc, argv);

  //MiddleLevelRewrite::insert() is not stable
  // we only deal with one file here, so only one global scope
  SgGlobal* globalscope = getFirstGlobalScope(project);
  // insert header
#if 0
 // using MiddleLevelRewrite to parse the content of the header, but NOT working!
  MiddleLevelRewrite::ScopeIdentifierEnum scope = MidLevelCollectionTypedefs::StatementScope;
  MiddleLevelRewrite::PlacementPositionEnum locationInScope = \
        MidLevelCollectionTypedefs::TopOfCurrentScope;
  MiddleLevelRewrite::insert(globalscope,"#include \"inputbuildFunctionCalls.h\" \n",scope,locationInScope);
#else

  insertHeader("inputbuildFunctionCalls.h",PreprocessingInfo::after,false,globalscope);
#endif
  // go to the function body
  SgFunctionDeclaration* mainFunc= findMain(project);
  SgBasicBlock* body= mainFunc->get_definition()->get_body();
  pushScopeStack(body);

  // void foo(int p_sum)
  SgType* return_type = buildVoidType();
  SgVarRefExp* arg1 = buildVarRefExp(SgName("p_sum"));//type is inferred from symbol table
  SgExprListExp* arg_list = buildExprListExp();
  appendExpression(arg_list,arg1);
  SgExprStatement* callStmt1 = buildFunctionCallStmt(SgName("foo"),return_type, arg_list);

      // insert before the last return statement
  SgStatement* lastStmt = getLastStatement(topScopeStack());
  insertStatement(lastStmt,callStmt1);
#if 1
  //int bar(double); it is declared in a header
  //build call stmt then
  SgType* return_type_2 = buildIntType();
  SgDoubleVal* arg_2 = buildDoubleVal(0.5);
  SgExprListExp* arg_list_2 = buildExprListExp();
  appendExpression(arg_list_2,arg_2);
  SgExprStatement* callStmt_2 = buildFunctionCallStmt(SgName("bar"),return_type_2, arg_list_2);

      // insert before the last return statement
  lastStmt = getLastStatement(topScopeStack());
  insertStatement(lastStmt,callStmt_2);
#endif
  popScopeStack();
  AstPostProcessing(project);

  AstTests::runAllTests(project);

  return backend (project);
}
{% endhighlight %}
</figure>

</details>

We are interested in lines 35-44:

<figure class="customlines-container">
{% highlight c++ %}
35  // void foo(int p_sum)
36  SgType* return_type = buildVoidType();
37  SgVarRefExp* arg1 = buildVarRefExp(SgName("p_sum"));//type is inferred from symbol table
38  SgExprListExp* arg_list = buildExprListExp();
39  appendExpression(arg_list,arg1);
40  SgExprStatement* callStmt1 = buildFunctionCallStmt(SgName("foo"),return_type, arg_list);
41
42  // insert before the last return statement
43  SgStatement* lastStmt = getLastStatement(topScopeStack());
44  insertStatement(lastStmt,callStmt1);
{% endhighlight %}
</figure>

A C function call contains a return type, function name and one or more parameters. We’ll build a new piece of AST for all of them. After creating a new subtree based on those information, we attach the subtree to the existing AST tree. In the source file, line 35-44 are the essential code to insert the new function call. Line 36 claims the return type for the new function. Line 37-39 create its parameter list. Line 40 generates a statement of function call. Finally, line 44 inserts this function call right before the return statement in the main function.

We will run this translator on the following input code:

<figure class="lineno-container">
{% highlight c linenos %}
void foo(int x);

int main (void)
{
  int p_sum=0;
  return p_sum;
}
{% endhighlight %}
</figure>

with the corresponding header file:

<figure class="lineno-container">
{% highlight c linenos %}
#ifdef __cplusplus
extern "C" {
#endif

extern int foo(double x);
extern int bar(double x);


#ifdef __cplusplus
 }
#endif
{% endhighlight %}
</figure>

Note that there is no function *call* to `foo()` or `bar()`. Our goal is to generate and insert two function calls of `foo()` and `bar()` with parameters `p_sum` and `0.5`, respectively, after inserting the header.

Let's build the tool first.

```.term1
cd /home/freecc/build/rose_build/tests/nonsmoke/functional/roseTests/astInterfaceTests/
make buildFunctionCalls
```

And obtain the input files above:

```.term1
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-ast-modification/inputbuildFunctionCalls.C
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-ast-modification/inputbuildFunctionCalls.h
```

Finally, we run the translator on the input code.

```.term1
./buildFunctionCalls -c inputbuildFunctionCalls.C
```

Let's check the output of the translator.

```.term1
cat -n rose_inputbuildFunctionCalls.C
```

<details class="code-collapsible">
<summary>Click here to view output source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
#include "inputbuildFunctionCalls.h"
void foo(int x);

int main()
{
  int p_sum = 0;
  foo(p_sum);
  bar(0.500000);
  return p_sum;
}
{% endhighlight %}
</figure>

</details>


We see that the translator has successfully inserted the two function calls with the correct parameters and location at lines 7 and 8.

### Summary ###
In this two-part tutorial, we have looked at how to make AST modifications for source-to-source transformations. We have only scratched the surface of the power of ROSE to make program transformations. We encourage readers to explore the `SageBuilder` and `SageInterface` namespaces to discover builder functions for their own use cases.

## Additional Resources ##
  * More examples of constructing the AST using high-level interfaces can be found at `rose/tests/nonsmoke/functional/roseTests/astInterfaceTests`.
  * The source files of the high level interfaces are located in `rose/src/frontend/SageIII/sageInterface`.
  * [API reference for `SageBuilder`](http://rosecompiler.org/ROSE_HTML_Reference/namespaceSageBuilder.html).
  * [API reference for `SageInterface`](http://rosecompiler.org/ROSE_HTML_Reference/namespaceSageInterface.html).

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-07-09-rose-ast-modification-part2.markdown)
