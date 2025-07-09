import os
import server
from aiohttp import web

VALID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

@server.PromptServer.instance.routes.post("/batch-loader/get-image-list")
async def get_image_list(request):
    try:
        data = await request.json()
        image_dir = data.get("image_dir")

        if not image_dir or not os.path.isdir(image_dir):
            return web.json_response([])

        files = [f for f in os.listdir(image_dir) if os.path.splitext(f.lower())[1] in VALID_EXTENSIONS]
        files.sort()
        return web.json_response(files)
    except Exception as e:
        print(f"[BatchImageLoader] API Error (get-image-list): {e}")
        return web.json_response([])

# NOUVELLE ROUTE API pour les aperçus
@server.PromptServer.instance.routes.get("/batch-loader/view-preview")
async def view_preview(request):
    query = request.rel_url.query
    image_dir = query.get("image_dir")
    filename = query.get("filename")

    if not image_dir or not filename:
        return web.Response(status=400, text="Missing image_dir or filename")

    image_path = os.path.join(image_dir, filename)
    if os.path.commonpath([image_dir, image_path]) != image_dir or not os.path.isfile(image_path):
        return web.Response(status=404, text="File not found or access denied")
    
    # Sert le fichier image directement
    return web.FileResponse(image_path)


from .batch_image_loader import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]