var worlds = [
    {
        "path": "www/world/Workbench/index.html",
        "requiredFeatures": [
            "image_tracking"
        ],
        "startupConfiguration": {
            "camera_position": "back",
            "camera_resolution": "auto"
        }
    },
    {
        "path": "www/world/Viewer/index.html",
        "requiredFeatures": [
            "image_tracking"
        ],
        "startupConfiguration": {
            "camera_position": "back",
            "camera_resolution": "auto"
        }
    }
]

function getWorldPath(world) {
	return worlds[world];

}
