import os
import server
from aiohttp import web

from .batch_image_loader import (
    NODE_CLASS_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS,
    IMAGE_EXTENSIONS,
    list_input_subfolders,
    resolve_input_folder,
    resolve_input_file,
)


# Returns the current folder choices so the UI can refresh the dropdown without
# reloading ComfyUI (e.g. after uploading a new folder on MimicPC).
@server.PromptServer.instance.routes.get("/batch-loader/get-folder-list")
async def get_folder_list(request):
    try:
        return web.json_response(list_input_subfolders())
    except Exception as e:
        print(f"[BatchImageLoader] API Error (get-folder-list): {e}")
        return web.json_response([])


@server.PromptServer.instance.routes.post("/batch-loader/get-image-list")
async def get_image_list(request):
    try:
        data = await request.json()
        folder = resolve_input_folder(data.get("folder"))

        if not folder or not os.path.isdir(folder):
            return web.json_response([])

        files = [f for f in os.listdir(folder) if os.path.splitext(f.lower())[1] in IMAGE_EXTENSIONS]
        files.sort()
        return web.json_response(files)
    except Exception as e:
        print(f"[BatchImageLoader] API Error (get-image-list): {e}")
        return web.json_response([])


# Serves a preview image, resolved (and traversal-checked) inside the input directory.
@server.PromptServer.instance.routes.get("/batch-loader/view-preview")
async def view_preview(request):
    query = request.rel_url.query
    folder = query.get("folder")
    filename = query.get("filename")

    if not folder or not filename:
        return web.Response(status=400, text="Missing folder or filename")

    image_path = resolve_input_file(folder, filename)
    # Only ever serve image files from this preview route (defense in depth).
    if not image_path or os.path.splitext(image_path.lower())[1] not in IMAGE_EXTENSIONS:
        return web.Response(status=404, text="File not found or access denied")

    return web.FileResponse(image_path)


WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
