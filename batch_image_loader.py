import os
from PIL import Image
import torch
import numpy as np

class BatchImageLoader:
    VALID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_dir": ("STRING", {"default": "ComfyUI/input"}),
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
        if not os.path.isdir(image_dir):
            error_msg = f"BatchImageLoader: Le dossier '{image_dir}' n'existe pas."
            return (torch.zeros((1, 64, 64, 3), dtype=torch.float32), error_msg, "")

        files = [f for f in os.listdir(image_dir) if os.path.splitext(f.lower())[1] in self.VALID_EXTENSIONS]
        
        if not files:
            error_msg = f"BatchImageLoader: Aucun fichier image dans '{image_dir}'."
            return (torch.zeros((1, 64, 64, 3), dtype=torch.float32), error_msg, "")

        selected_file = None
        files.sort() # Always sort for predictable order
        
        if mode == 'selection (fixed)':
            selected_file = selected_image if selected_image in files else files[0]
        else: # Batch
            # Logic for 'reverse_Batch' has been removed
            actual_index = image_index % len(files)
            selected_file = files[actual_index]
            print(f"BatchImageLoader: Loading index {actual_index} -> {selected_file}")

        image_path = os.path.join(image_dir, selected_file)
        img = Image.open(image_path).convert("RGB")
        
        image_np = np.array(img).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np)[None,]
        
        return (image_tensor, selected_file, "\n".join(files))

NODE_CLASS_MAPPINGS = { "BatchImageLoader": BatchImageLoader }
NODE_DISPLAY_NAME_MAPPINGS = { "BatchImageLoader": "🖼️ Batch Image Loader" }