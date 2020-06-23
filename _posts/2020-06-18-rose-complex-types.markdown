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
Consider the source code example below, showing the use of the `volatile` type modifier.
```c++
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
```
You should save this code to `${ROSE_BUILD}/tutorial` as `volatile_ex.cxx`, as we will use it shortly.

It will be helpful to refer to the AST generated from the ROSE PDF generator tool. It can be downloaded <a href="/images/volatile_ex.cxx.pdf" target="_blank">here (click to open in a new tab)</a>. Of importance are the `SgInitializedName` IR nodes which contain information about variables in our source code. This is where modifiers such as *volatile* are contained instead of `SgVariableDeclaration`. 

The source code of the ROSE traversal tool that looks for volatile modifiers can be viewed in Vim by
```.term1
vim ${ROSE_SRC}/tutorial/volatileTypeModifier.C
```

For each IR node we visit, we check if it is of type `SgInitializedName`, as volatile modifiers are contained within those nodes (lines 14-15). If we have an `SgInitializedName` node, then we print its name (e.g., `a`) and get its type (lines 17-18). The type indicates the variable type; e.g., for `b`, it is an `SgPointerType` as it is a pointer, and for `a` it is an `SgModifierType` as volatile variables act as modifiers. If our `SgInitializedName` contains a modifier type, we check if it is the volatile modifier and print it if so (lines 21-26). Line 24 uses the `SgModifierType` object to determine if there is a volatile modifier contained within this `SgInitializedName`. This is done by using the `get_typeModifier()` member function of the `SgModifierType` object, followed by the `get_constVolatileModifier()` and `isVolatile()` member functions. Note that these items are not contained within the `SgInitializedName` nodes on the generated PDF for brevity, but are indeed part of the nodes and are exposed to the ROSE API. Lines 28-38 print out the list of associated `SgModifierType` nodes; however, this class is not currently used in ROSE and can be ignored.

Finally, in lines 40-54, we demonstrate that the volatile modifier type is *not* exposed in the `SgVariableDeclaration` nor `SgVariableDefinition` IR nodes, as one may expect. In this code, even though the `isVolatile()` function can be obtained from the `SgVariableDeclaration` and `SgVariableDefinition` classes, volatile modifiers are not exposed to those nodes, so we expect this portion of the code to always print `false` for any IR nodes of these types encountered.

Let's run this traversal tool with our sample code above. Be sure to exit Vim first. First, we build it:
```.term1
cd ${ROSE_BUILD}/tutorial
make volatileTypeModifier
```
And then run it, assuming that the input code has been named `volatile_ex.cxx`:
```.term1
./volatileTypeModifier volatile_ex.cxx
```

From the output, we see that we have performed a successful AST traversal, and for each `SgVariableDeclaration`, `SgVariableDefinition`, and `SgInitializedName` IR nodes, we print some relevant information about volatile modifiers. As we expected, `isVolatile` is false for all `SgVariableDeclaration` and `SgVariableDefinition` nodes. For `SgInitializdName` nodes, we print the variable name, its type, whether or not it is volatile, and the modifier nodes. Note that `a` and `y` are volatile nodes. Although `b` is volatile-quantified, our tool does not realize this because the type of `b` is `SgPointerType`. This behavior is expected as `volatile int *b` is a pointer *to* a volatile variable, rather than a volatile pointer. 

## B. Function Parameter Types ##
The analysis of functions often requires the query of the function types. This tutorial example shows how to obtain the function parameter types for any function. Note that functions also have a type which is based on their signature, a combination of their return type and function parameter types. Any functions sharing the same return type and function parameter types have the same function type (the function type, a `SgFunctionType` IR node, will be shared between such functions).

#### Examples ####

We will use the following code snippet for this section and those following. Please save it as `function_param_ex.cxx` to `${ROSE_BUILD}/tutorial`. 
```c++
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
```
Notice that there is a lot going on in this source code - we have overloaded functions, template parameters, and a templated class. We will discuss how ROSE handles these cases in the following sections; for now, let us only focus on function parameter types.

Let's take a look at the source code of the `typeInfoFromFunctionParameter` translator, included with ROSE, that reads an application (our source code above) and outputs information about the function parameter types for each function. This information includes the order of the function declaration in the global scope, name of the function, and the types of each parameter declared in the function declaration. We can view this source code in Vim by
```.term1
vim ${ROSE_SRC}/tutorial/typeInfoFromFunctionParameters.C 
```

In this translator, we do not explicitly traverse the AST as in previous examples; instead, we can use the alternate method of using the Query Library to search for nodes with a specific type. This is useful for simple translators, such as this one. To query the AST in this regard, we use the `NodeQuery` namespace to obtain a container of `SgNode`s corresponding to the type being searched for. `NodeQuery::querySubTree` takes as parameters the root `SgProject` node and the IR node type to search for. In our case, we are looking for `V_SgFunctionDeclaration`. Many SAGE classes/nodes in ROSE contain static variants, prefixed by `V_`, that can be used for queries. We perform this query in line 17 of the translator. 

Once we have all the nodes of type `SgFunctionDeclaration`, we iterate through the container (line 20) and keep track of how many function declarations we have encountered so far. We then create a pointer to the current type so that we may use its member functions (lines 23-24). Note that there are a number of builtin functions defined as part of the g++ and gcc compatibility and these are output as well. These are marked as *compiler generated functions* within ROSE. We would like to differentiate between the two different types, and this is what the conditional on line 27 is doing. We continue so long as we are not working with a compiler generated function.

To obtain the parameters of the function, we simply call the `get_parameterList()` function on our `SgFunctionDeclaration` pointer obtained previously. We then print its name and increase the global function counter on line 33. We then obtain the initialized names of the function parameters by the `get_args()` function on the `SgFunctionParameterList` pointer, followed by iterating over each parameter and printing its type (lines 35-41). Finally, we print all the compiler generated functions on line 45. It is important to note that we iterate for each function found in the input source code, and for each function found, we print its parameter types.

Let's run this translator on the input code above. Build it by
```.term1
cd ${ROSE_BUILD}/tutorial
make typeInfoFromFunctionParameters
```

Run the translator on our `function_param_ex.cxx` input file by
```.term1
./typeInfoFromFunctionParameters function_param_ex.cxx
```

After 3,506 compiler generated functions, we see our own function declaration `foo` (and `main`). Note that the `foo` function is overloaded, but the translator has no issue identifying them as separate entities. In each case, we are able to print the parameter types. 

## C. Resolving Overloaded Functions ##
In this section, we will look at a translator that reads an application (the same `function_param_ex.cxx` source code as above) and reposts on the mapping between function calls and function declarations. This is trivial since all overloaded function resolution is done within the frontend and so need not be computed (this is because all type resolution is done in the frontend and stored in the AST explicitly). Other compiler infrastructures often require this to be figured out from the AST, when type resolution is unavailable, and while not too hard for C, this is particularly complex for C++ (due to overlapping and type promotion within function arguments).

#### Example ####
This translator is known as `resolveOverloadedFunction` and is available at
```.term1
vim ${ROSE_SRC}/tutorial/resolveOverloadedFunction.C
```

In this translator, we follow much of the same initial procedure to perform a subtree query as in the previous section. This time, however, we are interested in `SgFunctionCallExp` nodes, and so we use `V_SgFunctionCallExp` as the parameter to the subtree query. `SgFunctionCallExp` represents the *general* concept of a C++ function call and is an expression. Once we have it on lines 22-23, we obtain the actual expression using the `get_function()` member function. This object will let us perform a more detailed analysis of function expressions in the input source code.

We can determine if our function expression is a function being called with the `SgFunctionRefExp` class, which represents actual functions being called (e.g., `foo`), on line 29-31. If this returned object is `NULL`, the node in the AST represents a *member function*, as this is (technically) not a called function in terms of the `SgFunctionRefExp` class. Otherwise, we have a non-member function, as in our two calls to the `foo` function in the input source code. We make these checks with the conditional starting on line 32.

The next step is to determine the *symbol* of the function. This represents the function name, and in the case of a member function, represents the entire class + member name, such as `instantiatedClass.foo()` in our input code. For non-member functions, we need only obtain the symbol using the `get_symbol()` function on the `SgFunctionRefExp` object, which returns an `SgFunctionSymbol`. We do this on line 35. For member functions, we need to extract the right-hand side of the binary dot operator expression. This easily done by obtaining the `SgDotExp` object from the function expression and using the `get_rhs_operand()` function on this object (lines 40-43). Once this is done, we obtain a `SgMemberFunctionRefExp` object, which represents a member function call. From there, we can simply use the `get_symbol()` function as before. 

Finally, on lines 52-60, we obtain the final function declaration through a `SgFunctionDeclaration` object. We need the symbol to do this; this object also gives us information about the function declaration in the input source code, such as its location. Lines 56-59 print this information; notice that we are able to resolve overloaded functions using this methodology through the use of `SgFunctionSymbol`. That is, despite having overloaded function calls, we are able to distinguish between them.  

Let's build this translator by
```.term1
cd ${ROSE_BUILD}/tutorial
make resolveOverloadedFunction
```

Run the translator on `function_param_ex.cxx`:
```.term1
./resolveOverloadedFunction function_param_ex.cxx
```

The output shows each function call of `foo` being resolved by an overloaded function, even those inside the instantiated class.

## D. Template Parameter Extraction ##
In this tutorial, we will look at a translator that reads an application (a modified version of the previous input) and outputs some information about each instantiated template, including the template arguments. As a brief note, ROSE provides special handling for C++ templates because template instantiation must be controlled by the compiler. Templates that require instantiation are instantiated by ROSE and can be seen in the traversal of the AST (and transformed). Any templates that can be instantiated by the backend compiler **and** *are not transformed* are not output within the code generation phase.

#### Example ####
For this section, we will consider the input source code below, which a slightly modified version of the previous two sections' input:
```c++
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
```
Please save this code as `template_param_ex.cxx` in `${ROSE_BUILD}/tutorial`.

The translator of interest for this section is `templateParameter`:
```.term1
vim ${ROSE_SRC}/tutorial/templateParameter.C
```

Once again, we perform an AST subtree query, searching for `SgTemplateInstantiationDecl` nodes, as this contains all template instantiation declarations in our code. We again keep a global count of template classes and iterate over each declaration (lines 20-21). For each declaration, we obtain a pointer to the `SgTemplateInstanationDecl` object, as usual, and output the template name using `get_templateName()`. To obtain the parameter list, we use the `get_templateArguments()` function, much like we did for function parameter extraction (line 32). We then iterate through each parameter and print the template argument type. This translator is very similar to the function parameter extraction translator in Section B; however, it showcases working with template parameters instead. This can be trickier due to the ability to nest template parameters.

Let's build and run this tool with the example code above:
```.term1
cd ${ROSE_BUILD}/tutorial
make templateParameter
./templateParameter template_param_ex.cxx
```

The output shows each template class instantiation that appears in the input source code. Our first instantiation, on line 16, has template parameter `char`, as shown in the output of the translator. We have three more instantiations on lines 20-22, including one with a nested `char` parameter. However, the translator has no issue indicating that the argument here is of type `templatedClass<char>`.

## E. Summary ##
In this chapter, we have gotten familiar with working with various complex types in ROSE. We learned about traversing the AST and searching for nodes of interest, both with a traversal and with a query. We looked at examples involving type and declaration modifiers, function and template parameter extraction, and overloaded function resolution. There are many other types that can be searched with the AST in ROSE. We recommend looking into the ROSE API to learn more.

## F. Additional Resources ##
* The [ROSE HTML reference page](http://rosecompiler.org/ROSE_HTML_Reference/index.html) contains a full doxygenerated API that may be helpful in writing your own tools that search for specific types in the AST. 
* The [ROSE User manual](http://rosecompiler.org/uploads/ROSE-UserManual.pdf) contains some more information about AST queries in Chapter 6.

Source file for this page: [link](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2020-06-18-rose-complex-types.markdown)
