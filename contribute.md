Adding a tutorial involves two web pages.
* One is a newly created tutorial page written in Markdown.  
* The other is the landing page also written in Markdown, in which you need to add a link to the page of the new tutorial.
  * For Clang/LLVM tutorials, the landing page is ./_posts/2019-11-06-clang-llvm-landing.markdown
  * For ROSE tutorials, the landing page is ./_posts/2019-11-06-rose-landing.markdown

After editing these two files, you can start a pull request. The changes will be made effective once the request is merged, using this Github Pages repo.

### 1. Tutorial Page
Take the autoPar tutorial as an example.
https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-07-01-rose-autopar.markdown

You can create a new similar Markdown file named ```2019-07-01-rose-your-tutorial.markdown``` and put it in the folder ```./_posts```. Please note that the file must follow the date-tutorial-name.markdown convention to be linked to a parent web page later.

#### a. Update headers

Add title, author, date and so on.
The docker image used for sandbox could be specified here. Currently, we provide the following images.
- `freecompilercamp/pwc:full`: it contains both LLVM 10 and ROSE. If no image is specified by user, this one is used by default.
- `freecompilercamp/pwc:llvm10`: it contains only LLVM 10.
- `freecompilercamp/pwc:rose`: it contains only a release version of ROSE.
- `freecompilercamp/pwc:rose-debug`: it contains a debug build of ROSE, `-O0` is used by default.
- `freecompilercamp/pwc:rose-bug`: it contains an old version of ROSE that has a loop stride bug.
- `freecompilercamp/pwc:16.04`: it's a legacy sandbox with the old version of ROSE and LLVM 8.x based on Ubuntu 16.04.

For example, to specify to use the image of ROSE in the tutorial above, add the following line to the header of [tutorial markdown file](https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-07-01-rose-autopar.markdown
).
```
image: freecompilercamp/pwc:rose
```

#### b. Add content

Write freely in Markdown.

Some special syntax:
* For the code only for browsing, use a pair of triple backticks \`\`\` to include them.
* For browsing code with line numbers, use the following syntax, replacing ```<language>``` and ```<your_code>``` with your input:
```markdown
&lt;figure class="lineno-container">;
&#123;% highlight <language> linenos %}
<your_code>
&#123;% endhighlight #}
&lt;/figure>;
```
* For the code clickable and executed in the sandbox, use ```.term1``` as code snippet type.

For example,  in the following example, ```echo HELLO``` contained in ```.term1``` code snippet will print ``HELLO`` in the sandbox terminal.

You can style your syntax based on various languages; for browsing code without line numbers, place the language immediately after the first three backticks, and for browsing code with line numbers, place the language in the ```&#123;% highlight <language> linenos %}``` component. A list of supported languages can be found [here](https://github.com/rouge-ruby/rouge/wiki/List-of-supported-languages-and-lexers).

There are some built-in environment variables to faciliate the creation of command lines:
* For ROSE: $ROSE_BUILD,
* For Clang/LLVM: $LLVM_PATH, $LLVM_BUILD, $LLVM_SRC

Sometimes you want to insert a figure into your tutorial. You need to
* First create the figure and save it into a png file
* Upload the png file to top_dir/compiler-classroom/images
* Inside of your tutorial, add a link to the figure:
```
![Your wonderful figure caption here](/images/your_figure_name.png)
```

#### c. Update sandbox docker image (optionally)

Currently in the sandbox terminal, basic development tools have been installed, such as ```gcc```, ```rose```, ```llvm``` and ```vim```. If any other tool is required for your tutorials, you can either ask the visitors to install them as part of your tutorials. Or you can add them in the docker image.

To customize the sandbox, please check [Deploy FreeCC to AWS](https://github.com/chunhualiao/freeCompilerCamp/wiki/Deploy-FreeCC-to-AWS).

## 2. Landing Pages

Again, we have two landing pages
* One for Clang/LLVM tutorials: https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-11-06-clang-llvm-landing.markdown
* The other for ROSE tutorials: https://github.com/freeCompilerCamp/freecompilercamp.github.io/blob/master/_posts/2019-11-06-rose-landing.markdown

For example, to add a new tutorial for ROSE, go to the ROSE's landing page and insert a link to your tutorial page. The targeted link is the file name mentioned above without date and extension. For example, the address to ```2019-07-01-rose-autopar.markdown``` is ```/rose-autopar```. A proper title should be provided as well.

The modified section is shown as follows.
```markdown
[Trying autoPar - Auto Parallelization Tool in ROSE](/rose-autopar)
  * This is a tool which can automatically insert OpenMP pragmas into input serial C/C++ codes.

[Fixing a Bug in OpenMP Implementation](/rose-fix-bug-in-omp)
  * This tutorial is to show how to fix OpenMP implementation bugs in ROSE compiler.
```
