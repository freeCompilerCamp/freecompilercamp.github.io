In addition to all normal markdown features, we provide some special CSS classes for additional customization of tutorial content. A great resource for markdown is available [here](https://www.markdownguide.org/).

A tutorial making use of all of the features discussed below is available [here](https://raw.githubusercontent.com/freeCompilerCamp/freecompilercamp.github.io/master/_posts/2020-07-17-rose-inlining.markdown) (raw source).

## Code Snippets ##
There are two ways to add code snippets to your tutorials:
  * Wrap your code with three backticks (```). You can also specify a language for syntax highlighting by providing its name immedaitely after the first three backticks. A list of supported langauges can be found [here](https://github.com/rouge-ruby/rouge/wiki/List-of-supported-languages-and-lexers).
    * Example (ignore indentation):
      ```
          ```c
          int main() {
            return 0;
          }
          ```
      ```
  * Wrap your code with liquid highlight tags, as in the example below.
    * Example:
      ```
      {% highlight c %}
      int main() {
        return 0;
      }
      {% endhighlight %}
      ```

#### Line Numbers ####
If you would like a code snippet to have line numbers, you must use the second option and provide the `linenos` parameter after the language; e.g., `highlight c linenos`. Additionally, you must wrap the entire component with a figure HTML tag of class `lineno-container`, as in the example below:

  ```
  <figure class="lineno-container">
  {% highlight c linenos %}
  int main() {
    return 0;
  }
  {% endhighlight %}
  </figure>
  ```

This will produce the code snippet with consecutive line numbers starting from 1.

Unfortunately, Jekyll does not provide a mechanism for starting line numbers at a certain number at the time of this writing. This is useful if you reference a portion of a code as a standalone code snippet. To work around this, we provide a special CSS class that styles the code snippet to better support custom line numbers (no wrapping, for example).

To use this class, wrap your code with a figure HTML tag of class `customlines-container` instead of `lineno-container`. Do not use the `linenos` parameter in the liquid highlight tag. Instead, manually insert the line numbers left-aligned in the code. We recommend inserting at least one tab after each line number to improve readability.

Example:

  ```
  <figure class="customlines-container">
  {% highlight c %}
  20  int main() {
  21    return 0;  
  22  }
  {% endhighlight %}
  </figure>
  ```

#### Collapsible Code Snippets ####
At times, a code snippet may be long and decrease readability. While we encourage tutorials to focus only on code snippets of importance, this can often occur for the output of a tool. In this case, it is beneficial to create a collapsible code segment. We often use this for allowing users to view the terminal output of a tool or command when they are not using the terminal, while still allowing those users using the terminal to skip over the code snippet.

To create a collapsible segment, wrap the code with a details HTML tag of class `code-collapsible`. Use the summary tag to provide text for the collapsible element. Ensure that there is an empty line between the code and the start and end details tags.

Example:

  ```
  <details class="code-collapsible">
  <summary>Click to here to view output code.</summary>

  <figure class="lineno-container">
  {% highlight c linenos %}
  int main() {
    return 0;
  }
  {% endhighlight %}
  </figure>

  </details>
  ```

## Clickable Terminal Commands ##
We encourage tutorials to make use of clickable terminal commands so that users do not have to write commands in the terminal themselves, as these may become long (e.g., with a `wget`). To facilitate this, we provide a special code snippet that creates a clickable box in the tutorial that transfers the contents of that box to the terminal. Commands are executed sequentially in the order they appear.

To do this, simply use the three backtick method and specify `.term1` as the language immediately after the first three backticks.

Example (ignore indentation):

  ```
      ```.term1
      cd ${ROSE_BUILD}/tutorial
      make volatileTypeModifier
      ```
  ```
