---
layout: post
title: "Working with Complex Types"
author: "@vec4"
date: 2020-06-18
categories: beginner
tags: [rose]
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
In the previous tutorial, we saw how to traverse the AST to obtain the number of times a loop is encountered. In this tutorial, we will explore how to traverse the AST when more complex types exist in the input source code that we would like to obtain from the AST. We will take a look at some examples for various complex types, including type/declaration modifiers, function parameter extraction, resolving overloaded functions, and template parameter extraction.

---

## A. Type and Declaration Modifiers ##
Most languages support the general concept of modifiers to types, declarations, etc. The keyword *volatile* for example is a modifier to the type where it is used in a declaration. Searching for the modifiers for types and declarations, however, can be confusing. They are often not where one would expect, and most often because of corner cases in the language that force them to be handled in specific ways.

Here, we will look at some tutorial code to demonstrate how to access the *volatile* modifier used in the declaration of types for variables. We demonstrate that the modifier is not present in the `SgVariableDeclaration` or the `SgVariableDefinition`, but is located in the `SgModifierType` used to wrap the type returned from the `SgInitializedName` (the variable in the variable declaration).

#### Example ####
Let's take a look at the input source code example for this section, showing use of the `volatile` type modifier.
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-complex-types/volatile_ex.cxx
cat -n volatile_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight cpp linenos %}
// Input example of use of "volatile" type modifier
volatile int a, *b;

void foo()
{
	for (volatile int y = 0; y < 10; y++)
	{
	}
}

int main(int argc, char* argv[])
{
	return 0;
}
{% endhighlight %}
</figure>

</details>

Notice we have three volatile variables: `a`, `b`, and `y`. `b` is actually a pointer to a volatile variable, rather than a volatile variable itself.

In our AST traversal to find volatile type modifiers, we are looking for nodes of type `SgInitializedName` that represent the notion of a variable in a declaration. The general concept of a variable declaration is represented by `SgVariableDeclaration`. Similarly, variable definitions/initializations are represented by `SgVaraibleDefinition`. It is important to note that, in ROSE, each `SgVaraibleDeclaration` contains **only one** `SgInitializedName`. We can see this from a small excerpt of the AST corresponding to the sample `volatile_ex.cxx` source, in particular the portion corresponding to the variable `a`:

<p align="center">
  <img src="/images/SgInitializedName_Example.png" />
</p>

The concept of type modifiers in ROSE is represented via the `SgModifierType` class, a subclass of `SgType`. The type modifier itself is represented by the `SgTypeModifier` class; we can obtain the latter from the former via the `get_typeModifier()` function. Although exposed through the API, it is important to note that type modifiers are **not** present in `SgVariableDeclaration` or `SgVariableDefinition` objects; they can only be reliably obtained via the `SgModifierType` returned from `SgInitializedName`.

With these considerations in mind, let's discuss the source of the translator. We can view it by

```.term1
cat -n ${ROSE_SRC}/tutorial/volatileTypeModifier.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight cpp linenos %}
#include "rose.h"

using namespace std;

class visitorTraversal : public AstSimpleProcessing
   {
     public:
          void visit(SgNode* n);
   };

void visitorTraversal::visit(SgNode* n)
   {
  // The "volatile" madifier is in the type of the SgInitializedName
     SgInitializedName* initializedName = isSgInitializedName(n);
     if (initializedName != NULL)
        {
          printf ("Found a SgInitializedName = %s \n",initializedName->get_name().str());
          SgType* type = initializedName->get_type();

          printf ("   initializedName: type = %p = %s \n",type,type->class_name().c_str());
          SgModifierType* modifierType = isSgModifierType(type);
          if (modifierType != NULL)
             {
               bool isVolatile = modifierType->get_typeModifier().get_constVolatileModifier().isVolatile();
               printf ("   initializedName: SgModifierType: isVolatile = %s \n",(isVolatile == true) ? "true" : "false");
             }

          SgModifierNodes* modifierNodes = type->get_modifiers();
          printf ("   initializedName: modifierNodes = %p \n",modifierNodes);
          if (modifierNodes != NULL)
             {
               SgModifierTypePtrVector modifierList = modifierNodes->get_nodes();
               for (SgModifierTypePtrVector::iterator i = modifierList.begin(); i != modifierList.end(); i++)
                  {
                    printf ("initializedName: modifiers: i = %s \n",(*i)->class_name().c_str());
                  }
             }
        }

  // Note that the "volatile" madifier is not in the SgVariableDeclarationnor the SgVariableDefinition
     SgVariableDeclaration* variableDeclaration = isSgVariableDeclaration(n);
     if (variableDeclaration != NULL)
        {
          bool isVolatile = variableDeclaration->get_declarationModifier().get_typeModifier().get_constVolatileModifier().isVolatile();
          printf ("SgVariableDeclaration: isVolatile = %s \n",(isVolatile == true) ? "true" : "false");
          SgVariableDefinition* variableDefinition = variableDeclaration->get_definition();
       // printf ("variableDefinition = %p \n",variableDefinition);
          if (variableDefinition != NULL)
             {
               bool isVolatile = variableDefinition->get_declarationModifier().get_typeModifier().get_constVolatileModifier().isVolatile();
               printf ("SgVariableDefinition: isVolatile = %s \n",(isVolatile == true) ? "true" : "false");
             }
        }
   }

// must have argc and argv here!!
int main(int argc, char * argv[])
   {
  // Initialize and check compatibility. See Rose::initialize
     ROSE_INITIALIZE;

     SgProject *project = frontend (argc, argv);

     visitorTraversal myvisitor;
     myvisitor.traverseInputFiles(project,preorder);

     return backend(project);
   }
{% endhighlight %}
</figure>

</details>

Here, we perform a standard pre-order AST traversal. Let's first take a look at lines 14-26 of the `visit()` function. Lines 28-38 of the translator can be ignored as the `SgModifierTypes` class is no longer used in ROSE.

<figure class="customlines-container">
{% highlight c++ %}
14  SgInitializedName* initializedName = isSgInitializedName(n);
15  if (initializedName != NULL)
16  {
17    printf ("Found a SgInitializedName = %s \n",initializedName->get_name().str());
18    SgType* type = initializedName->get_type();
19
20    printf ("   initializedName: type = %p = %s \n",type,type->class_name().c_str());
21    SgModifierType* modifierType = isSgModifierType(type);
22    if (modifierType != NULL)
23    {
24      bool isVolatile = modifierType->get_typeModifier().get_constVolatileModifier().isVolatile();
25      printf ("   initializedName: SgModifierType: isVolatile = %s \n",(isVolatile == true) ? "true" : "false");
26    }
{% endhighlight %}
</figure>

For each IR node we visit, we check if it is of type `SgInitializedName` (lines 14-15) and print its name and type if so. Note that `get_type()` returns the general `SgType` object, from which we must obtain the `SgModifierType` object on line 21. If we do indeed have a type modifier from this variable, we use a series of member functions to determine if it is volatile on line 24 using `get_typeModifier()`. Note, in particular, that a type modifier can be const or volatile, hence the use of the `get_constVolatileModifier()` function followed by `isVolatile()`.

Next, let's look at lines 40-53:

<figure class="customlines-container">
{% highlight c++ %}
40  // Note that the "volatile" madifier is not in the SgVariableDeclaration nor the SgVariableDefinition
41  SgVariableDeclaration* variableDeclaration = isSgVariableDeclaration(n);
42  if (variableDeclaration != NULL)
43  {
44    bool isVolatile = variableDeclaration->get_declarationModifier().get_typeModifier().get_constVolatileModifier().isVolatile();
45    printf ("SgVariableDeclaration: isVolatile = %s \n",(isVolatile == true) ? "true" : "false");
46    SgVariableDefinition* variableDefinition = variableDeclaration->get_definition();
47    // printf ("variableDefinition = %p \n",variableDefinition);
48    if (variableDefinition != NULL)
49    {
50      bool isVolatile = variableDefinition->get_declarationModifier().get_typeModifier().get_constVolatileModifier().isVolatile();
51      printf ("SgVariableDefinition: isVolatile = %s \n",(isVolatile == true) ? "true" : "false");
52    }
53  }
{% endhighlight %}
</figure>

This portion of the code demonstrates that the volatile modifier type is *not* exposed in the `SgVariableDeclaration` nor `SgVariableDefinition` IR nodes, despite being exposed to the API. We expect this portion of the code to always print `false` for any IR nodes of these types encountered.

Let's run this traversal tool with our sample code above. Be sure to exit Vim first. First, we build it:
```.term1
cd ${ROSE_BUILD}/tutorial
make volatileTypeModifier
```
And then run it with our input source code:
```.term1
./volatileTypeModifier volatile_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to show output.</summary>

<figure class="lineno-container">
{% highlight linenos %}
SgVariableDeclaration: isVolatile = false
SgVariableDefinition: isVolatile = false
Found a SgInitializedName = a
   initializedName: type = 0x7f2b107ee590 = SgModifierType
   initializedName: SgModifierType: isVolatile = true
   initializedName: modifierNodes = (nil)
SgVariableDeclaration: isVolatile = false
SgVariableDefinition: isVolatile = false
Found a SgInitializedName = b
   initializedName: type = 0x7f2b1089a628 = SgPointerType
   initializedName: modifierNodes = (nil)
SgVariableDeclaration: isVolatile = false
SgVariableDefinition: isVolatile = false
Found a SgInitializedName = y
   initializedName: type = 0x7f2b107ee590 = SgModifierType
   initializedName: SgModifierType: isVolatile = true
   initializedName: modifierNodes = (nil)
Found a SgInitializedName = argc
   initializedName: type = 0x7f2b10cbe010 = SgTypeInt
   initializedName: modifierNodes = (nil)
Found a SgInitializedName = argv
   initializedName: type = 0x7f2b0e62f010 = SgArrayType
   initializedName: modifierNodes = (nil)
{% endhighlight %}
</figure>

</details>

From the output, we see that we have performed a successful AST traversal, and for each `SgVariableDeclaration`, `SgVariableDefinition`, and `SgInitializedName` IR nodes, we print some relevant information about volatile modifiers. As we expected, `isVolatile` is false for all `SgVariableDeclaration` and `SgVariableDefinition` nodes. For `SgInitializdName` nodes, we print the variable name, its type, whether or not it is volatile, and the modifier nodes. Note that `a` and `y` are volatile nodes. Although `b` is volatile-qualified, our tool does not realize this because the type of `b` is `SgPointerType`. This behavior is expected as `volatile int *b` is a pointer *to* a volatile variable, rather than a volatile pointer.

## B. Function Parameter Types ##
The analysis of functions often requires the query of the function types. This tutorial example shows how to obtain the function parameter types for any function. Note that functions also have a type which is based on their signature, a combination of their return type and function parameter types. Any functions sharing the same return type and function parameter types have the same function type (the function type, a `SgFunctionType` IR node, will be shared between such functions).

#### Example ####

We will use the following code snippet for this section and the following.
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-complex-types/function_param_ex.cxx
cat -n function_param_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight cpp linenos %}
// Templated class declaration used in template parameter example code
template <typename T>
class templateClass
{
	public:
		int x;

		void foo(int);
		void foo(double);
};

// Overloaded functions for testing overloaded function resolution
void foo(int);
void foo(double)
{
	int x = 1;
	int y;

	// Added to allow non-trivial CFG
	if (x)
		y = 2;
	else
		y = 3;
}

int main(int argc, char* argv[])
{
	foo(42);
	foo(3.14159265);

	templateClass<char> instantiatedClass;
	instantiatedClass.foo(7);
	instantiatedClass.foo(7.0);

	for (int i = 0; i < 4; i++)
	{
		int x;
	}

	return 0;
}
{% endhighlight %}
</figure>

</details>

Notice that there is a lot going on in this source code - we have overloaded functions, template parameters, and a templated class. We will discuss how ROSE handles these cases in the following sections; for now, let us only focus on function parameter types.

Let's take a look at the source code of the `typeInfoFromFunctionParameter` translator, included with ROSE, that reads an application (our source code above) and outputs information about the function parameter types for each function. This information includes the order of the function declaration in the global scope, name of the function, and the types of each parameter declared in the function declaration. We can view this source code by

```.term1
cat -n ${ROSE_SRC}/tutorial/typeInfoFromFunctionParameters.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// Example ROSE Translator: used within ROSE/tutorial

#include "rose.h"

using namespace std;

int main( int argc, char * argv[] )
   {
  // Initialize and check compatibility. See Rose::initialize
     ROSE_INITIALIZE;

  // Build the AST used by ROSE
     SgProject* project = frontend(argc,argv);
     ROSE_ASSERT(project != NULL);

  // Build a list of functions within the AST
     Rose_STL_Container<SgNode*> functionDeclarationList = NodeQuery::querySubTree (project,V_SgFunctionDeclaration);

     int functionCounter = 0;
     for (Rose_STL_Container<SgNode*>::iterator i = functionDeclarationList.begin(); i != functionDeclarationList.end(); i++)
        {
       // Build a pointer to the current type so that we can call the get_name() member function.
          SgFunctionDeclaration* functionDeclaration = isSgFunctionDeclaration(*i);
          ROSE_ASSERT(functionDeclaration != NULL);

       // DQ (3/5/2006): Only output the non-compiler generated IR nodes
          if ( (*i)->get_file_info()->isCompilerGenerated() == false)
             {
               SgFunctionParameterList* functionParameters = functionDeclaration->get_parameterList();
               ROSE_ASSERT(functionDeclaration != NULL);

            // output the function number and the name of the function
               printf ("Non-compiler generated function name #%3d is %s \n",functionCounter++,functionDeclaration->get_name().str());

               SgInitializedNamePtrList & parameterList = functionParameters->get_args();
               int parameterCounter = 0;
               for (SgInitializedNamePtrList::iterator j = parameterList.begin(); j != parameterList.end(); j++)
                  {
                    SgType* parameterType = (*j)->get_type();
                    printf ("   parameterType #%2d = %s \n",parameterCounter++,parameterType->unparseToString().c_str());
                  }
             }
            else
             {
               printf ("Compiler generated function name #%3d is %s \n",functionCounter++,functionDeclaration->get_name().str());
             }
        }

     return 0;
   }
{% endhighlight %}
</figure>

</details>

Let's start by looking at lines 17-24:

<figure class="customlines-container">
{% highlight c++ %}
16  // Build a list of functions within the AST
17  Rose_STL_Container<SgNode*> functionDeclarationList = NodeQuery::querySubTree (project,V_SgFunctionDeclaration);
19  int functionCounter = 0;
20  for (Rose_STL_Container<SgNode*>::iterator i = functionDeclarationList.begin(); i != functionDeclarationList.end(); i++)
21  {
22    // Build a pointer to the current type so that we can call the get_name() member function.
23    SgFunctionDeclaration* functionDeclaration = isSgFunctionDeclaration(*i);
24    ROSE_ASSERT(functionDeclaration != NULL);
{% endhighlight %}
</figure>

Note we do not explicitly traverse the AST as in previous examples; instead, we can use the alternate method of using the Query Library to search for nodes with a specific type. This is useful for simple translators, such as this one. To query the AST in this regard, we use the `NodeQuery` namespace to obtain a container of `SgNode`s corresponding to the type being searched for. `NodeQuery::querySubTree` takes as parameters the root `SgProject` node and the IR node type to search for. In our case, we are looking for `V_SgFunctionDeclaration`. Many SAGE classes/nodes in ROSE contain static variants, prefixed by `V_`, that can be used for queries.

On line 20, we iterate through the container and keep track of the number of function declarations encountered so far. In ROSE, function parameters are contained within the `SgFunctionParameterList` class, which are child nodes of `SgFunctionDeclaration` IR nodes, as shown in the AST excerpt below.

<p align="center">
  <img src="/images/SgFunctionDeclaration_Example.png" />
</p>

Hence, we need to extract these parameters from the `SgFunctionDeclaration` nodes.

Next, let's take a look at the remaining lines of the translator.

<figure class="customlines-container">
{% highlight c++ %}
26  // DQ (3/5/2006): Only output the non-compiler generated IRnodes
27  if ( (*i)->get_file_info()->isCompilerGenerated() == false)
28  {
29    SgFunctionParameterList* functionParameters = functionDeclaration->get_parameterList();
30    ROSE_ASSERT(functionDeclaration != NULL);
31
32    // output the function number and the name of the function
33    printf ("Non-compiler generated function name #%3d is %s \n",functionCounter++,functionDeclaration->get_name().str());
34
35    SgInitializedNamePtrList & parameterList = functionParameters->get_args();
36    int parameterCounter = 0;
37    for (SgInitializedNamePtrList::iterator j = parameterList.begin(); j != parameterList.end(); j++)
38    {
39      SgType* parameterType = (*j)->get_type();
40      printf ("   parameterType #%2d = %s \n",parameterCounter++,parameterType->unparseToString().c_str());
41    }
42  }
43  else
44  {
45    printf ("Compiler generated function name #%3d is %s \n",functionCounter++,functionDeclaration->get_name().str());
46  }
{% endhighlight %}
</figure>

Note that there are a number of builtin functions defined as part of the g++ and gcc compatibility and these are output as well. These are marked as *compiler generated functions* within ROSE. We would like to differentiate between the two different types, and this is what the conditional on line 27 is doing. We continue so long as we are not working with a compiler generated function.

To obtain the parameters of the function, we simply call the `get_parameterList()` function to obtain the `SgFunctionParameterList` object. We then obtain the initialized names of the function parameters by the `get_args()` function, followed by iterating over each parameter and printing its type (lines 35-41). Finally, we print all the compiler generated functions on line 45. It is important to note that we iterate for each function found in the input source code, and for each function found, we print its parameter types.

Let's run this translator on the input code above. Build it by
```.term1
cd ${ROSE_BUILD}/tutorial
make typeInfoFromFunctionParameters
```

Run the translator on our `function_param_ex.cxx` input file by
```.term1
./typeInfoFromFunctionParameters function_param_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to show output.</summary>

<figure class="lineno-container">
{% highlight linenos %}
...3506 compiler generated functions...
Non-compiler generated function name #3507 is foo
   parameterType # 0 = int
Non-compiler generated function name #3508 is foo
   parameterType # 0 = double
Non-compiler generated function name #3509 is foo
   parameterType # 0 = int
Non-compiler generated function name #3510 is foo
   parameterType # 0 = double
Compiler generated function name #3511 is foo
Compiler generated function name #3512 is foo
Non-compiler generated function name #3513 is main
   parameterType # 0 = int
   parameterType # 1 = char *[]
{% endhighlight %}
</figure>

</details>

After 3,506 compiler generated functions, we see our own function declaration `foo` (and `main`). Note that the `foo` function is overloaded, but the translator has no issue identifying them as separate entities. In each case, we are able to print the parameter types.

## C. Resolving Overloaded Functions ##
In this section, we will look at a translator that reads an application (the same `function_param_ex.cxx` source code as above) and reposts on the mapping between function calls and function declarations. This is trivial since all overloaded function resolution is done within the frontend and so need not be computed (this is because all type resolution is done in the frontend and stored in the AST explicitly). Other compiler infrastructures often require this to be figured out from the AST, when type resolution is unavailable, and while not too hard for C, this is particularly complex for C++ (due to overloading and type promotion within function arguments).

#### Example ####
This translator is known as `resolveOverloadedFunction` and is available at
```.term1
cat -n ${ROSE_SRC}/tutorial/resolveOverloadedFunction.C
```

<details class="code-collapsible">
<summary>Click here to view source code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// Example ROSE Translator: used within ROSE/tutorial

#include "rose.h"

using namespace std;

int main( int argc, char * argv[] )
   {
  // Initialize and check compatibility. See Rose::initialize
     ROSE_INITIALIZE;

  // Build the AST used by ROSE
     SgProject* project = frontend(argc,argv);
     ROSE_ASSERT(project != NULL);

  // Build a list of functions within the AST
     Rose_STL_Container<SgNode*> functionCallList = NodeQuery::querySubTree (project,V_SgFunctionCallExp);

     int functionCounter = 0;
     for (Rose_STL_Container<SgNode*>::iterator i = functionCallList.begin(); i != functionCallList.end(); i++)
        {
          SgFunctionCallExp* functionCallExp = isSgFunctionCallExp(*i);
          ROSE_ASSERT(functionCallExp != NULL);


          SgExpression* functionExpression = functionCallExp->get_function();
          ROSE_ASSERT(functionExpression != NULL);

          SgFunctionRefExp* functionRefExp = isSgFunctionRefExp(functionExpression);

          SgFunctionSymbol* functionSymbol = NULL;
          if (functionRefExp != NULL)
             {
            // Case of non-member function
               functionSymbol = functionRefExp->get_symbol();
             }
            else
             {
            // Case of member function (hidden in rhs of binary dot operator expression)
               SgDotExp* dotExp = isSgDotExp(functionExpression);
               ROSE_ASSERT(dotExp != NULL);

               functionExpression = dotExp->get_rhs_operand();
               SgMemberFunctionRefExp* memberFunctionRefExp = isSgMemberFunctionRefExp(functionExpression);
               ROSE_ASSERT(memberFunctionRefExp != NULL);

               functionSymbol = memberFunctionRefExp->get_symbol();
             }

          ROSE_ASSERT(functionSymbol != NULL);

          SgFunctionDeclaration* functionDeclaration = functionSymbol->get_declaration();
          ROSE_ASSERT(functionDeclaration != NULL);

       // Output mapping of function calls to function declarations
            printf ("Location of function call #%d at line %d resolved by overloaded function declared at line %d \n",
                 functionCounter++,
                 functionCallExp->get_file_info()->get_line(),
                 functionDeclaration->get_file_info()->get_line());
        }

     return 0;
   }
{% endhighlight %}
</figure>

</details>

Let's begin with lines 20-31.

<figure class="customlines-container">
{% highlight c++ %}
20  for (Rose_STL_Container<SgNode*>::iterator i = functionCallList.begin(); i != functionCallList.end(); i++)
21  {
22    SgFunctionCallExp* functionCallExp = isSgFunctionCallExp(*i);
23    ROSE_ASSERT(functionCallExp != NULL);
24
25
26    SgExpression* functionExpression = functionCallExp->get_function();
27    ROSE_ASSERT(functionExpression != NULL);
28
29    SgFunctionRefExp* functionRefExp = isSgFunctionRefExp(functionExpression);
30
31    SgFunctionSymbol* functionSymbol = NULL;
{% endhighlight %}
</figure>

In this translator, we follow much of the same initial procedure to perform a subtree query as in the previous section. This time, however, we are interested in `SgFunctionCallExp` nodes, and so we use `V_SgFunctionCallExp` as the parameter to the subtree query. `SgFunctionCallExp` represents the *general* concept of a C++ function call and is an expression. Once we have it on lines 22-23, we obtain the actual expression using the `get_function()` member function. This object will let us perform a more detailed analysis of function expressions in the input source code.

In C, and more so in C++, the left-hand side of a function call (e.g., `foo`) is itself an expression. This expression may be simple, such as in the case when a free-standing function is called directly; for example, by calling `foo()`. In this case, the left-hand side is an `SgFunctionRefExp`. Notice that we obtain this expression on line 29.

Of course, the left-hand side of a function call can be significantly more complicated and can be quite arbitrary. We could have a C++ call to a member function (e.g., `bar.foo()` or `bar->foo()`), or have a family of function calls if the function is virtual. There could also be arbitrary expressions producing function pointers (e.g., `(******(foo))()`). As a result, it can often be tricky to analyze left-hand sides of function call expressions. Fortunately, ROSE provides a library function that takes in a call expression and fills a vector with a set of function declarations that could be called (see Section F for more details). There are also some expression-based classes that allow us to extract the left-hand side easier; e.g., `SgDotExp` representing the dot operator.

With this kept in mind, we can look into the core of translator on lines 32-59.

<figure class="customlines-container">
{% highlight c++ %}
32  if (functionRefExp != NULL)
33  {
34    // Case of non-member function
35    functionSymbol = functionRefExp->get_symbol();
36  }
37  else
38  {
39    // Case of member function (hidden in rhs of binary dot operator expression)
40    SgDotExp* dotExp = isSgDotExp(functionExpression);
41    ROSE_ASSERT(dotExp != NULL);
42
43    functionExpression = dotExp->get_rhs_operand();
44    SgMemberFunctionRefExp* memberFunctionRefExp = isSgMemberFunctionRefExp(functionExpression);
45    ROSE_ASSERT(memberFunctionRefExp != NULL);
46
47    functionSymbol = memberFunctionRefExp->get_symbol();
48  }
49
50  ROSE_ASSERT(functionSymbol != NULL);
51
52  SgFunctionDeclaration* functionDeclaration = functionSymbol->get_declaration();
53  ROSE_ASSERT(functionDeclaration != NULL);
54
55  // Output mapping of function calls to function declarations
56  printf ("Location of function call #%d at line %d resolved by overloaded function declared at line %d \n",
57  functionCounter++,
58  functionCallExp->get_file_info()->get_line(),
59  functionDeclaration->get_file_info()->get_line());
{% endhighlight %}
</figure>

In our example here, we keep things simple and look into the case where the left-hand side is either a free-standing function or is a member function accessed via the dot operator. In the latter case, the `SgFunctionRefExp` object obtained previously will be `NULL`, as the left-hand side is more complicated than a simple free-standing function. Otherwise, we can obtain the left-hand side by simply extracting the `SgFunctionSymbol`, which represents the function name, via the `get_symbol()` (lines 32-36). For member functions, we need to obtain the expression from the right-hand side of the dot operator (line 41), which will be of type `SgMemberFunctionRefExp`. Once we have this object, we can obtain the symbol through the same `get_symbol()` function as previously (lines 42-45). Lines 52-60 obtain the function declaration using the obtained symbol, which contains declaration information (e.g., location in source code).

Let's build this translator by
```.term1
cd ${ROSE_BUILD}/tutorial
make resolveOverloadedFunction
```

Run the translator on `function_param_ex.cxx`:
```.term1
./resolveOverloadedFunction function_param_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to view output.</summary>

<figure class="lineno-container">
{% highlight linenos %}
Location of function call #0 at line 28 resolved by overloaded function declared at line 13
Location of function call #1 at line 29 resolved by overloaded function declared at line 0
Location of function call #2 at line 32 resolved by overloaded function declared at line 0
Location of function call #3 at line 33 resolved by overloaded function declared at line 0
{% endhighlight %}
</figure>

</details>

The output shows each function call of `foo` being resolved by an overloaded function, even those inside the instantiated class. It may appear curious that the source location for the last three calls of `foo` are output as 0. Looking at the input code, we see that the first call `foo(42)` at line 28 is resolved by the overloaded function at line 13, as output by the translator. The second call `foo(3.14159265)` at line 29 is resolved by the overloaded function definition at line 14. The translator, however, outputs that the resolved overloaded function is at line 0; this is because, for consistency purposes, the ROSE compiler requires a function to be declared *separately* before it is defined. In the case where the first function declaration is also a function definition, as is the scenario here, ROSE generates a *hidden* first non-defining declaration, hence the output of 0. Similarly, the last two calls of `foo` on lines 32 and 33 are template functions, which are instantiated by the compiler, and therefore not technically part of the source code, leading to the output of 0 for the source location of these two calls as well.

## D. Template Parameter Extraction ##
In this tutorial, we will look at a translator that reads an application (a modified version of the previous input) and outputs some information about each instantiated template, including the template arguments. As a brief note, ROSE provides special handling for C++ templates because template instantiation must be controlled by the compiler. Templates that require instantiation are instantiated by ROSE and can be seen in the traversal of the AST (and transformed). Any templates that can be instantiated by the backend compiler **and** *are not transformed* are not output within the code generation phase.

#### Example ####
For this section, we will consider some templated example source code, which a slightly modified version of the previous two sections' input:
```.term1
cd ${ROSE_BUILD}/tutorial
wget https://raw.githubusercontent.com/freeCompilerCamp/code-for-rose-tutorials/master/rose-complex-types/template_param_ex.cxx
cat -n template_param_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to view code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
// Templated class declaration used in template parameter example code
template <typename T>
class templatedClass
{
        public:
                int x;

                void foo(int);
                void foo(double);
};

int main()
{
        templatedClass<char> instantiatedClass;
        instantiatedClass.foo(7);
        instantiatedClass.foo(7.0);

        templatedClass<int> instantiatedClassInt;
        templatedClass<float> instantiatedClassFloat;
        templatedClass<templatedClass<char>> instantiatedClassNestedChar;

        for (int i = 0; i < 4; i++)
        {
                int x;
        }

        return 0;
}
{% endhighlight %}
</figure>

</details>

Notice that this code contains a templated class, and we make several instantiations of that class. In this example, we will look into extracting the template parameters from these instantiated objects.
The translator of interest for this section is `templateParameter`:

```.term1
cat ${ROSE_SRC}/tutorial/templateParameter.C
```

<details class="code-collapsible">
<summary>Click here to view code.</summary>

<figure class="lineno-container">
{% highlight c++ linenos %}
1  // Example ROSE Translator: used within ROSE/tutorial
2
3  #include "rose.h"
4
5  using namespace std;
6
7  int main( int argc, char * argv[] )
8     {
9    // Initialize and check compatibility. See Rose::initialize
10       ROSE_INITIALIZE;
11
12    // Build the AST used by ROSE
13       SgProject* project = frontend(argc,argv);
14       ROSE_ASSERT(project != NULL);
15
16    // Build a list of functions within the AST
17       Rose_STL_Container<SgNode*> templateInstantiationDeclList =
18            NodeQuery::querySubTree (project,V_SgTemplateInstantiationDecl);
19
20       int classTemplateCounter = 0;
21       for (Rose_STL_Container<SgNode*>::iterator i = templateInstantiationDeclList.begin();
22            i != templateInstantiationDeclList.end(); i++)
23          {
24            SgTemplateInstantiationDecl* instantiatedTemplateClass =isSgTemplateInstantiationDecl(*i);
25            ROSE_ASSERT(instantiatedTemplateClass != NULL);
26
27         // output the function number and the name of the function
28            printf ("Class name #%d is %s \n",
29                 classTemplateCounter++,
30                 instantiatedTemplateClass->get_templateName().str());
31
32            const SgTemplateArgumentPtrList& templateParameterList =instantiatedTemplateClass->get_templateArguments();
33            int parameterCounter = 0;
34            for (SgTemplateArgumentPtrList::const_iterator j = templateParameterList.begin();
35                 j != templateParameterList.end(); j++)
36               {
37                 printf ("   TemplateArgument #%d = %s \n",parameterCounter++,(*j)->unparseToString().c_str());
38               }
39          }
40
41       return 0;
42     }
43
{% endhighlight %}
</figure>

</details>

Let's look at the iteration over each `SgTemplateInstanationDecl` node, which contains all template instantiation declarations in our code. This corresponds to lines 24-38.

<figure class="customlines-container">
{% highlight c++ %}
24  SgTemplateInstantiationDecl* instantiatedTemplateClass =isSgTemplateInstantiationDecl(*i);
25  ROSE_ASSERT(instantiatedTemplateClass != NULL);
26
27  // output the function number and the name of the function
28  printf ("Class name #%d is %s \n",
29  classTemplateCounter++,
30  instantiatedTemplateClass->get_templateName().str());
31
32  const SgTemplateArgumentPtrList& templateParameterList =instantiatedTemplateClass->get_templateArguments();
33  int parameterCounter = 0;
34  for (SgTemplateArgumentPtrList::const_iterator j = templateParameterList.begin();
35    j != templateParameterList.end(); j++)
36  {
37    printf ("   TemplateArgument #%d = %s \n",parameterCounter++,(*j)->unparseToString().c_str());
38  }
{% endhighlight %}
</figure>

For each declaration, we obtain a pointer to the `SgTemplateInstanationDecl` object, as usual, and output the template name using `get_templateName()`. To obtain the parameter list, we use the `get_templateArguments()` function, much like we did for function parameter extraction (line 32). We then iterate through each parameter and print the template argument type. This translator is very similar to the function parameter extraction translator in Section B; however, it showcases working with template parameters instead. This can be trickier due to the ability to nest template parameters.

Let's build and run this tool with the example code above:
```.term1
cd ${ROSE_BUILD}/tutorial
make templateParameter
./templateParameter template_param_ex.cxx
```

<details class="code-collapsible">
<summary>Click here to view output.</summary>

<figure class="lineno-container">
{% highlight linenos %}
Class name #0 is templatedClass
   TemplateArgument #0 = char
Class name #1 is templatedClass
   TemplateArgument #0 = int
Class name #2 is templatedClass
   TemplateArgument #0 = float
Class name #3 is templatedClass
   TemplateArgument #0 = templatedClass< char >
{% endhighlight %}
</figure>

</details>

The output shows each template class instantiation that appears in the input source code. Our first instantiation, on line 16, has template parameter `char`, as shown in the output of the translator. We have three more instantiations on lines 20-22, including one with a nested `char` parameter. However, the translator has no issue indicating that the argument here is of type `templatedClass<char>`.

## E. Summary ##
In this chapter, we have gotten familiar with working with various complex types in ROSE. We learned about traversing the AST and searching for nodes of interest, both with a traversal and with a query. We looked at examples involving type and declaration modifiers, function and template parameter extraction, and overloaded function resolution. There are many other types that can be searched with the AST in ROSE. We recommend looking into the ROSE API to learn more.

### Practical ###
We encourage you to check your understanding of this section by completing the related [Practical](/rose-complex-types-practical).

## F. Additional Resources ##
* ROSE provides a library function that takes in a call expression and fills a vector with a set of function declarations that could be called. If a callee cannot be determined exactly (as in the case with a function pointer), the set of functions returned is an overapproximation. The [CallGraph.h](http://rosecompiler.org/ROSE_HTML_Reference/CallGraph_8h_source.html) header contains this function `CallTargetSet::getPropertiesForExpression`.
* The [ROSE HTML reference page](http://rosecompiler.org/ROSE_HTML_Reference/index.html) contains a full doxygenerated API that may be helpful in writing your own tools that search for specific types in the AST. Classes referenced in this tutorial can also be viewed here for more information.
* The [ROSE User manual](http://rosecompiler.org/uploads/ROSE-UserManual.pdf) contains some more information about AST queries in Chapter 6.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-06-18-rose-complex-types.markdown)
