# Batch Image Loader for ComfyUI

![image](https://github.com/user-attachments/assets/1f822bf4-8787-4382-b164-8b177332165d)

This project is a custom node for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) that allows for flexible image loading from a directory. It offers two main modes of operation: a "Batch" mode to sequentially iterate through all images in a folder, and a "Selection" mode to pick a specific image from a dropdown list with previews.

## 🖼️ Features

- **Batch Loading**: Automatically loads the next image in the directory with each workflow execution (thanks to the "increment" option on the `image_index` widget).
- **Fixed Selection**: Allows you to choose a specific image from a dropdown list. The image list updates dynamically when you change the source directory.
- **Image Preview**: In "Selection" mode, hover over a filename in the dropdown list to see a preview of the image directly in the ComfyUI interface.
- **Dynamic UI**: The node's widgets (dropdown list or index field) are automatically shown or hidden based on the selected mode.
- **Multiple Outputs**: The node provides not only the loaded image tensor but also the selected filename and the complete list of filenames in the directory.

## ⚙️ Installation

1.  Navigate to your ComfyUI installation directory.
2.  Go to the `ComfyUI/custom_nodes/` folder.
3.  Clone this repository
    ```bash
    cd ComfyUI/custom_nodes/
    git clone https://github.com/orion4d/batch_image_loader.py.git
    ```
4.  Install the required Python dependencies. Make sure to use the correct Python environment (ComfyUI's virtual environment).
    ```bash
    pip install -r requirements.txt
    ```
5.  Restart ComfyUI.

## 🚀 Usage

![image](https://github.com/user-attachments/assets/1e5634a2-0bd5-4779-880d-d743c7a747ba)

1.  After restarting ComfyUI, you can add the node to your workflow.
2.  Right-click on the canvas, then select `Add Node` -> `image/batch_loader` -> `🖼️ Batch Image Loader`.
3.  Configure the node's inputs:
    - **`image_dir`**: The path to the directory containing your images (e.g., `ComfyUI/input` or an absolute path).
    - **`mode`**:
      - **`selection (fixed)`**: Displays a `selected_image` dropdown menu. You can choose an image from this list. Hover over the options to see a preview.
      - **`Batch`**: Displays a numeric `image_index` field. This field will automatically increment after each generation, loading the next image in the folder (sorted alphabetically).
    - **`selected_image`**: (Visible only in `selection (fixed)` mode) The dropdown list of available images.
    - **`image_index`**: (Visible only in `Batch` mode) The index of the image to load from the sorted list of files.

4.  Connect the node's outputs to other nodes in your workflow:
    - **`image`**: The loaded image tensor, ready to be used by KSamplers, VAEs, etc.
    - **`filename`**: The filename of the loaded image (e.g., `image_001.png`). Useful for naming output files.
    - **`filename_list`**: A string containing the list of all valid filenames in the directory, separated by newlines.

## 💡 Pro Tip: How to Batch Process an Entire Folder

To automatically process every image in a directory, one after the other:

1.  Set the node's **`mode`** to **`Batch`**.
2.  Set the **`image_index`** to `0` to start with the first image.
3.  Right-click on the `image_index` widget and set **`Control After Generate`** to **`increment`**.
4.  Find out how many images are in your folder. You can connect the `filename_list` output to a primitive text node to see the list and count them.
5.  In the ComfyUI menu, click **"Extra options"** next to the "Queue Prompt" button.
6.  Set the **"Batch count"** to the total number of images in your folder.
7.  Click **"Queue Prompt"**. ComfyUI will now run the workflow for each image in the directory.

<div align="center">

<h3>🌟 <strong>Show Your Support</strong></h3>

<p>If this project helped you, please consider giving it a ⭐ on GitHub!</p>

<p><strong>Made with ❤️ for the ComfyUI community</strong></p>

<p><strong>by Orion4D</strong></p>

<a href="https://ko-fi.com/orion4d">
<img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy Me A Coffee" height="41" width="174">
</a>

</div>
