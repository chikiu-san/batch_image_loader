import os
from PIL import Image
import torch
import numpy as np
import folder_paths

IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

# Value shown in the folder dropdown that means "the ComfyUI input directory itself"
# (for images uploaded straight into input/ rather than into a subfolder).
INPUT_ROOT_LABEL = "input (root folder)"


def get_input_root():
    """Absolute path of the ComfyUI input directory."""
    return folder_paths.get_input_directory()


def list_input_subfolders():
    """Folder choices for the dropdown: the input root plus its top-level subfolders.

    The list is computed server-side, so MimicPC users pick a folder the server
    actually has instead of typing an unknown filesystem path.
    """
    root = get_input_root()
    folders = [INPUT_ROOT_LABEL]
    try:
        for name in sorted(os.listdir(root)):
            # Skip a folder whose name collides with the root sentinel, so it can't
            # shadow the "input root" choice in the dropdown / resolver.
            if name == INPUT_ROOT_LABEL:
                continue
            if os.path.isdir(os.path.join(root, name)):
                folders.append(name)
    except Exception as e:
        print(f"[BatchImageLoader] Could not list input folders: {e}")
    return folders


def resolve_input_folder(folder_value):
    """Map a dropdown value to an absolute path inside the input directory.

    Returns the absolute path, or None if the value escapes the input directory
    (path-traversal guard) or does not point at a real folder. Symlinks are resolved
    *before* the containment check, so a link pointing outside input/ is rejected.
    """
    root = os.path.realpath(get_input_root())
    if not folder_value or folder_value == INPUT_ROOT_LABEL:
        return root
    candidate = os.path.realpath(os.path.join(root, folder_value))
    try:
        if os.path.commonpath([root, candidate]) != root:
            return None
    except ValueError:
        # Different drives on Windows, etc. -> treat as outside.
        return None
    return candidate if os.path.isdir(candidate) else None


def resolve_input_file(folder_value, filename):
    """Resolve a single file inside a chosen input subfolder, with a traversal guard
    on the filename too (symlinks resolved before the check). Returns the absolute path or None."""
    folder = resolve_input_folder(folder_value)
    if not folder:
        return None
    candidate = os.path.realpath(os.path.join(folder, filename))
    try:
        if os.path.commonpath([folder, candidate]) != folder:
            return None
    except ValueError:
        return None
    return candidate if os.path.isfile(candidate) else None


class BatchImageLoader:
    VALID_EXTENSIONS = IMAGE_EXTENSIONS

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # Server-discovered folder dropdown (MimicPC-friendly) instead of a typed path.
                "image_dir": (list_input_subfolders(),),
                "selected_image": ("STRING", {"default": ""}),
                # "reverse_Batch" has been removed from the list
                "mode": (["selection (fixed)", "Batch"], {"default": "selection (fixed)"}),
                "image_index": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "step": 1, "control_after_generate": "increment"}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING", "STRING")
    RETURN_NAMES = ("image", "filename", "filename_list")
    FUNCTION = "load_batch_image"
    CATEGORY = "image/batch_loader"

    def load_batch_image(self, image_dir, selected_image, mode, image_index):
        folder = resolve_input_folder(image_dir)
        if not folder or not os.path.isdir(folder):
            error_msg = f"BatchImageLoader: Folder '{image_dir}' not found under the ComfyUI input directory."
            return (torch.zeros((1, 64, 64, 3), dtype=torch.float32), error_msg, "")

        files = [f for f in os.listdir(folder) if os.path.splitext(f.lower())[1] in IMAGE_EXTENSIONS]

        if not files:
            error_msg = f"BatchImageLoader: No image files in '{image_dir}'."
            return (torch.zeros((1, 64, 64, 3), dtype=torch.float32), error_msg, "")

        files.sort()  # Always sort for predictable order

        if mode == 'selection (fixed)':
            selected_file = selected_image if selected_image in files else files[0]
        else:  # Batch
            # Logic for 'reverse_Batch' has been removed
            actual_index = image_index % len(files)
            selected_file = files[actual_index]
            print(f"BatchImageLoader: Loading index {actual_index} -> {selected_file}")

        image_path = os.path.join(folder, selected_file)
        img = Image.open(image_path).convert("RGB")

        image_np = np.array(img).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np)[None,]

        return (image_tensor, selected_file, "\n".join(files))


NODE_CLASS_MAPPINGS = {"BatchImageLoader": BatchImageLoader}
NODE_DISPLAY_NAME_MAPPINGS = {"BatchImageLoader": "🖼️ Batch Image Loader"}
