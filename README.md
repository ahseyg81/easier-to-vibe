# easier-to-vibe 🌊

> **"Aren't you tired of copying and pasting while doing vibe coding?"** 

**easier-to-vibe** is a frictionless, browser-based code playground designed to keep you in the flow state. It turns multi-file AI code snippets into running applications instantly. No setup, no terminal chaos—just vibe.

## 🚀 Why this exists?
When coding with AI, you often get a single block of code containing `main.py`, `utils.py`, and `styles.css`. Manually creating these files breaks your focus.

**easier-to-vibe** solves this:
1.  **Paste** the entire chat/code block.
2.  **Parse** automatically into a virtual file system.
3.  **Run** Python, C, C++, or Web projects directly in the browser.

## ✨ Key Features

* **⚡ Smart Parsing:** Recognizes `//--- filename.ext ---` syntax and splits files automatically.
* **🐍 Polyglot Runtime:**
    * **Web:** Renders HTML/CSS/JS in a live preview frame.
    * **Backend:** Executes **Python** and **C/C++** using the Piston API.
* **magic-inputs™:** Automatically detects `input()` (Python) or `// input("Label")` (C) and generates UI input boxes. No more interacting with a raw console!
* **📦 Zip Export:** Download your generated project as a `.zip` file with one click.
* **🎨 Minimalist UI:** Dark mode by default. Because light attracts bugs.

## 🛠️ How to Use

1.  Open the [Live Editor](https://ahseyg81.github.io/easier-to-vibe/).
2.  Paste your code block in the editor. The format should be:
    ```javascript
    //--- main.py ---
    print("Hello Vibe Coder")

    //--- utils.py ---
    def vibe_check():
        return True
    ```
3.  Click **"Projeyi Ayrıştır" (Parse Project)**.
4.  Click **"Çalıştır" (Run)**.
5.  Enjoy the output in the terminal or preview window.

## 🤖 AI Prompting Tip
To get the best results, tell your AI assistant (ChatGPT, Claude, Gemini) this:

> "Please provide all code in a single block. Use `//--- filename.ext ---` as a separator for each file. For C inputs, use `// input("Label")` comment before scanf."

## 💻 Tech Stack
* **Frontend:** Vanilla JavaScript (ES6+), CSS3 Variables.
* **Execution Engine:** [Piston API](https://github.com/engineer-man/piston) (for Python/C execution).
* **Libraries:** JSZip (for downloading projects).
