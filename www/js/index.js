var app = {

    // MAIN
    // ----

    // represents the device capability of launching ARchitect Worlds with specific features
    isDeviceSupported: false,
    isArchitectWorldLoaded: false,

    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    onDeviceReady: function () {
        app.wikitudePlugin = cordova.require("com.wikitude.phonegap.WikitudePlugin.WikitudePlugin");
        // set a callback for android that is called once the back button was clicked.
        if (cordova.platformId == "android") {
            app.wikitudePlugin.setBackButtonCallback(app.onBackButton);
        }
        app.wikitudePlugin.setJSONObjectReceivedCallback(app.onJSONObjectReceived);
    },
    // --- Wikitude Plugin ---
    loadExampleARchitectWorld: function (world) {

        app.isArchitectWorldLoaded = false;

        /* cordova.file.applicationDirectory is used to demonstrate the use of the cordova file plugin in combination with the Wikitude plugin */
        /* The length check here is only necessary because for each world the same 'world' object is given here and we only want to change the path once. */
        if (world.path.length > cordova.file.applicationDirectory) {
            if (world.path.substring(0, cordova.file.applicationDirectory) != cordova.file.applicationDirectory) {
                world.path = cordova.file.applicationDirectory + world.path;
            }
        }

        app.prepareArchitectWorld(world, function () {
            app.loadARchitectWorld(world);
        });
    },
    loadCustomARchitectWorldFromURL: function (url) {
        var customArchitectWorld = {
            "path": url,
            "requiredFeatures": [
                "image_tracking",
                "geo"
            ],
            "startupConfiguration": {
                "camera_position": "back"
            }
        };
        app.isArchitectWorldLoaded = false;
        app.prepareArchitectWorld(customArchitectWorld, function () {
            app.loadARchitectWorld(customArchitectWorld);
        });
    },
    prepareArchitectWorld: function (architectWorld, successCallback) {
        app.wikitudePlugin.isDeviceSupported(function () {
                app.wikitudePlugin.requestAccess(
                    function () {
                        successCallback();
                    },
                    function (error) {
                        /* The error object contains two error messages.
                         * userDescription is a end user formatted message that can be displayed with e.g. a JS alert
                         * developerDescription is a developer formatted message with more detailed information about the error
                         */
                        /* Here, the userDescription is used to show a confirmation box which, in case of a positive result, shows the applications settings so that user can grant access. */
                        var openAppSettings = confirm(error.userDescription + '\nOpen App Settings?');
                        if (openAppSettings == true) {
                            app.wikitudePlugin.openAppSettings();
                        }
                    },
                    architectWorld.requiredFeatures);
            }, function (errorMessage) {
                alert(errorMessage);
            },
            architectWorld.requiredFeatures);
    },
    // Use this method to load a specific ARchitect World from either the local file system or a remote server
    loadARchitectWorld: function (architectWorld) {
        app.wikitudePlugin.loadARchitectWorld(function successFn(loadedURL) {
            /* Respond to successful world loading if you need to */
            app.isArchitectWorldLoaded = true;

        }, function errorFn(error) {
            app.isArchitectWorldLoaded = false;
            alert('Loading AR web view failed: ' + error);
        },
        architectWorld.path, architectWorld.requiredFeatures, architectWorld.startupConfiguration
        );
    },





    // API TO NATIVE PLATFORM
    // ----------------------

    // This function gets called when "AR.platform.sendJSONObject" is called from an ARchitect World
    onJSONObjectReceived: function (jsonObject) {
        if (typeof jsonObject.action !== 'undefined') {
            if (jsonObject.action === "capture_screen") {
                app.wikitudePlugin.captureScreen(
                    function (absoluteFilePath) {
                        alert("snapshot stored at:\n" + absoluteFilePath);
                    },
                    function (errorMessage) {
                        alert(errorMessage);
                    },
                    true, null
                );
            } else if (jsonObject.action === "get_video_absolute_path") {
                var path = cordova.file.dataDirectory + "videos/" + jsonObject.name;
                app.wikitudePlugin.callJavaScript("World.addVideo('" + path + "', 0, 0);");
            } else if (jsonObject.action === "get_audio_absolute_path") {
                var path = cordova.file.dataDirectory + "audio/" + jsonObject.name;
                app.wikitudePlugin.callJavaScript("World.addAudio('" + path + "', 0, 0);");
            } else if (jsonObject.action === "save_current_instant_target") { // for testing purposes only
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (fileSystem) {
                    fileSystem.getFile("SavedAugmentations.json", {
                        create: true,
                        exclusive: false
                    }, function (fileEntry) {
                        fileEntry.createWriter(function (writer) {
                            writer.write(jsonObject.augmentations);
                        }, app.saveError);
                    }, app.saveError);
                }, app.saveError);
                app.wikitudePlugin.callJavaScript("World.saveCurrentInstantTargetToUrl(\"" + cordova.file.dataDirectory + "SavedInstantTarget.wto" + "\");")
            } else if (jsonObject.action === "save_instant_target") {
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (fileSystem) {
                    fileSystem.getDirectory('augmentations/', {
                        create: true,
                        exclusive: false
                    }, function (dirEntry) {
                        dirEntry.getFile(jsonObject.name + ".json", {
                            create: true,
                            exclusive: false
                        }, function (fileEntry) {
                            fileEntry.createWriter(function (writer) {
                                writer.write(jsonObject.augmentations);
                            }, app.saveError);
                        }, app.saveError);
                    }, app.saveError);
                    fileSystem.getDirectory('targets/', {
                        create: true,
                        exclusive: false
                    }, function (dirEntry) {
                        console.log(dirEntry);
                    }, app.saveError);
                }, app.saveError);
                app.wikitudePlugin.callJavaScript("World.saveCurrentInstantTargetToUrl(\"" + cordova.file.dataDirectory + 'targets/' + jsonObject.name + ".wto" + "\");")
            } else if (jsonObject.action === "load_existing_instant_target") { // for testing purposes only
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (fileSystem) {
                    fileSystem.getFile("SavedAugmentations.json", null, function (fileEntry) {
                        fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = function (evt) {
                                var augmentations = evt.target.result;
                                app.wikitudePlugin.callJavaScript("World.loadExistingInstantTargetFromUrl(\"" + cordova.file.dataDirectory + "SavedInstantTarget.wto" + "\"," + augmentations + ");");
                            };
                            reader.readAsText(file);
                        }, app.loadError);
                    }, app.loadError);
                }, app.loadError);
            } else if (jsonObject.action === "load_instant_target") {
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory + 'augmentations/', function (fileSystem) {
                    fileSystem.getFile(jsonObject.name + ".json", null, function (fileEntry) {
                        fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = function (evt) {
                                var augmentations = evt.target.result;
                                app.wikitudePlugin.callJavaScript("World.loadExistingInstantTargetFromUrl(\"" + cordova.file.dataDirectory + 'targets/' + jsonObject.name + ".wto" + "\"," + augmentations + ");");
                            };
                            reader.readAsText(file);
                        }, app.loadError);
                    }, app.loadError);
                }, app.loadError);
            } else if (jsonObject.action === "delete_instant_target") {
                app.deleteTracker(jsonObject.name);
            } else if (jsonObject.action === "get_video_absolute_path") {
                app.wikitudePlugin.callJavaScript("World.addVideo(" + cordova.file.dataDirectory + "videos/" + jsonObject.name + ");");
            } else if (jsonObject.action === "get_saved_models") {
                // alert('received json')
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (fileSystem) {
                    // var directoryEntry = fileSystem;
                    // directoryEntry.getDirectory("targets", {create: true, exclusive: false}, onDirectorySuccess, onDirectoryFail);
                    fileSystem.getDirectory('targets', {
                        create: true,
                        exclusive: false
                    }, function (dir) {
                        var directoryReader = dir.createReader();
                        directoryReader.readEntries(function (targets) {
                            if (targets.length == 0)
                                alert("No Records");
                            else {
                                // alert(targets);
                                console.log(targets);
                                app.wikitudePlugin.callJavaScript("World.getTargets(" + JSON.stringify(targets) + ");");
                            }
                        }, app.loadError);
                    }, app.loadError);
                }, app.loadError);
            } else if (jsonObject.action === "get_saved_videos") {
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (fileSystem) {
                    fileSystem.getDirectory('videos', {
                        create: true,
                        exclusive: false
                    }, function (dir) {
                        var directoryReader = dir.createReader();
                        directoryReader.readEntries(function (videos) {
                            if (videos.length == 0)
                                alert("No videos.");
                            else {
                                console.log(videos);
                                app.wikitudePlugin.callJavaScript("World.getVideos(" + JSON.stringify(videos) + ");");
                            }
                        }, app.loadError);
                    }, app.loadError);
                }, app.loadError);
            } else if (jsonObject.action === "get_saved_audioFiles") {
                // alert('received json')
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (fileSystem) {
                    // var directoryEntry = fileSystem;
                    // directoryEntry.getDirectory("targets", {create: true, exclusive: false}, onDirectorySuccess, onDirectoryFail);
                    fileSystem.getDirectory('audio', {
                        create: true,
                        exclusive: false
                    }, function (dir) {
                        var directoryReader = dir.createReader();
                        directoryReader.readEntries(function (audioFiles) {
                            if (audioFiles.length == 0)
                                alert("No audio files.");
                            else {
                                // alert(videos);
                                console.log(audioFiles);
                                app.wikitudePlugin.callJavaScript("World.getAudioFiles(" + JSON.stringify(audioFiles) + ");");
                            }
                        }, app.loadError);
                    }, app.loadError);
                }, app.loadError);
            }
        }
    },





    // UTILITY METHODS
    // ---------------

    saveError: function (error) {
        alert("Could not save the current instant target.");
    },
    loadError: function (error) {
        alert("Could not load instant target, please save it first.");
    },
    deleteError: function (code) {
        if (code === 1) {
            alert('Deleting WTO file failed.');
        } else if (code === 2) {
            alert('Deleting augmentations file failed.');
        }
        alert('Deletion failed');
    },
    onBackButton: function () {
        /* Android back button was pressed and the Wikitude PhoneGap Plugin is now closed */
        window.location.reload(true);
    },
    showBuildInformation: function () {
        var sdkVersion = ""

        app.wikitudePlugin.getSDKVersion(function (version) {
            sdkVersion = version
        });

        app.wikitudePlugin.getSDKBuildInformation(function (buildInformationJSON) {
            var buildInformation = JSON.parse(buildInformationJSON);
            alert(
                "Build configuration: " + buildInformation.buildConfiguration + "\n" +
                "Build date: " + buildInformation.buildDate + "\n" +
                "Build number: " + buildInformation.buildNumber + "\n" +
                "Build version: " + sdkVersion
            );
        });
    },





    // DELETE METHODS
    // --------------

    deleteTracker: function (tracker) {
        tracker = tracker.split('.')[0];
        if (confirm('Delete [' + tracker + ']. Are you sure?')) {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + 'targets/', function (fileSystem) {
                fileSystem.getFile(tracker + '.wto', null, function (fileEntry) {
                    fileEntry.remove(function (file) {
                        alert("WTO file removed successfully!");
                    }, app.deleteError);
                }, app.deleteError);
            }, app.deleteError);
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + 'augmentations/', function (fileSystem) {
                fileSystem.getFile(tracker + '.json', null, function (fileEntry) {
                    fileEntry.remove(function (file) {
                        alert("Augmentations file removed successfully!");
                    }, app.deleteError);
                }, app.deleteError);
            }, app.deleteError);
        }
    },

    deleteVideo: function (video) {
        if (confirm('Delete [' + video + ']. Are you sure?')) {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + 'videos/', function (fileSystem) {
                fileSystem.getFile(video, null, function (fileEntry) {
                    fileEntry.remove(function (file) {
                        alert("Video file removed successfully!");
                    }, app.deleteError);
                }, app.deleteError);
            }, app.deleteError);
        }
    },

    deleteAudioFile: function (audio) {
        if (confirm('Delete [' + audio + ']. Are you sure?')) {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + 'audio/', function (fileSystem) {
                fileSystem.getFile(audio, null, function (fileEntry) {
                    fileEntry.remove(function (file) {
                        alert("audio file removed successfully!");
                    }, app.deleteError);
                }, app.deleteError);
            }, app.deleteError);
        }
    },





    // GETTER METHODS
    // --------------

    getTargets: function getTargetsFn() {

        function onFileSystemSuccess(fileSystem) {
            var directoryEntry = fileSystem;
            directoryEntry.getDirectory("augmentations", {
                create: true,
                exclusive: false
            }, onDirectorySuccess, onDirectoryFail);
            // onDirectorySuccess(fileSystem);
        }

        function onDirectorySuccess(parent) {
            var directoryReader = parent.createReader();
            directoryReader.readEntries(success, fail);
        }

        function fail(error) {
            alert("Failed to list directory contents: " + error.code);
        }

        function success(entries) {
            if (entries.length == 0)
                alert("No targets.");
            else {
                for (var i = 0; i < entries.length; i++) {
                    entries[i].file(function (file) {
                        console.log("file.name " + file.name);
                        // $('#targets').append("<li><a href=''>"+file.name+"</a></li>").listview('refresh');
                        $('#targets').append("<li><a href='#'>" + file.name + "</a><a href='#' id='" + file.name + "' onclick='app.deleteTracker(id)'>Delete</a></li>").listview('refresh');
                    })
                }
            }
            // alert('file list created');
        }

        function onDirectoryFail(error) {
            alert("Unable to create new directory: " + error.code);
        }

        function onFileSystemFail(evt) {
            alert(evt.target.error.code);
        }

        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, onFileSystemSuccess, onFileSystemFail);
    },



    getVideos: function getVideosFn() {

        function onFileSystemSuccess(fileSystem) {
            var directoryEntry = fileSystem;
            directoryEntry.getDirectory("videos", {
                create: true,
                exclusive: false
            }, onDirectorySuccess, onDirectoryFail);
            // onDirectorySuccess(fileSystem);
        }

        function onDirectorySuccess(parent) {
            var directoryReader = parent.createReader();
            directoryReader.readEntries(success, fail);
        }

        function fail(error) {
            alert("Failed to list directory contents: " + error.code);
        }

        function success(entries) {
            if (entries.length == 0)
                alert("No videos.");
            else {
                for (var i = 0; i < entries.length; i++) {
                    entries[i].file(function (file) {
                        console.log("file.name " + file.name);
                        // $('#targets').append("<li><a href=''>"+file.name+"</a></li>").listview('refresh');
                        $('#videos').append("<li><a href='#' name='" + file.name + "' onclick='app.playVideo(name)'>" + file.name + "</a><a href='#' id='" + file.name + "' onclick='app.deleteVideo(id)'>Delete</a></li>").listview('refresh');
                    })
                }
            }
            // alert('file list created');
        }

        function onDirectoryFail(error) {
            alert("Unable to create new directory: " + error.code);
        }

        function onFileSystemFail(evt) {
            alert(evt.target.error.code);
        }

        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, onFileSystemSuccess, onFileSystemFail);
    },


    getAudioFiles: function getAudioFilesFn() {

        function onFileSystemSuccess(fileSystem) {
            var directoryEntry = fileSystem;
            directoryEntry.getDirectory("audio", {
                create: true,
                exclusive: false
            }, onDirectorySuccess, onDirectoryFail);
            // onDirectorySuccess(fileSystem);
        }

        function onDirectorySuccess(parent) {
            var directoryReader = parent.createReader();
            directoryReader.readEntries(success, fail);
        }

        function fail(error) {
            alert("Failed to list directory contents: " + error.code);
        }

        function success(entries) {
            if (entries.length == 0)
                alert("No audio files.");
            else {
                for (var i = 0; i < entries.length; i++) {
                    entries[i].file(function (file) {
                        console.log("file.name " + file.name);
                        // $('#targets').append("<li><a href=''>"+file.name+"</a></li>").listview('refresh');
                        $('#audiofiles').append("<li><a href='#' name='" + file.name + "' onclick='app.playAudio(name)'>" + file.name + "</a><a href='#' id='" + file.name + "' onclick='app.deleteAudioFile(id)'>Delete</a></li>").listview('refresh');
                    })
                }
            }
            // alert('file list created');
        }

        function onDirectoryFail(error) {
            alert("Unable to create new directory: " + error.code);
        }

        function onFileSystemFail(evt) {
            alert(evt.target.error.code);
        }

        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, onFileSystemSuccess, onFileSystemFail);
    },




    // VIDEO RELATED METHODS
    // --------------------

    captureVideo: function captureVideoFn() {
        var errorCallback = function (e) {
            console.log(e);
        }

        var successCallback = function () {
            alert('File saved successfully!');
        }

        var moveFile = function (fileUri) {
            window.resolveLocalFileSystemURL(
                fileUri,
                function (fileEntry) {
                    var newFileUri = cordova.file.dataDirectory;
                    var oldFileUri = fileUri;
                    var fileExt = "." + oldFileUri.split('.').pop();
                    var ts = Math.round((new Date()).getTime() / 1000);
                    var name = prompt('Video name:');
                    if (name) {
                        var newFileName = name + '-' + ts + fileExt;
                        window.resolveLocalFileSystemURL(newFileUri,
                            function (fs) {
                                fs.getDirectory('videos/', {
                                        create: true,
                                        exclusive: false
                                    },
                                    function (dirEntry) {
                                        fileEntry.moveTo(dirEntry, newFileName, successCallback, errorCallback);
                                    },
                                    errorCallback
                                    // errorCallback('failed getting dir videos')
                                );
                            },
                            errorCallback
                            // errorCallback('new path resolve failed')
                        );
                    } else {
                        errorCallback('undefined file name');
                    }
                },
                errorCallback
                // errorCallback('filesystem resolve failed')
            );
        }

        // capture callback
        var captureSuccess = function (mediaFiles) {
            var i, path, len;
            for (i = 0, len = mediaFiles.length; i < len; i += 1) {
                path = mediaFiles[i].fullPath;
                moveFile(path);
                console.log(path);
            }
            console.log(mediaFiles);
        };

        // capture error callback
        var captureError = function (error) {
            navigator.notification.alert('Error code: ' + error.code, null, 'Capture Error');
        };

        // start video capture
        navigator.device.capture.captureVideo(captureSuccess, captureError, {
            limit: 1,
            quality: 0
        });
    },

    playVideo: function playVideoFn(videoname) {
        var path = cordova.file.dataDirectory + "videos/" + videoname;
        var options = {
            successCallback: function () {
                console.log("Video was closed without error.");
            },
            errorCallback: function (errMsg) {
                console.log("Error! " + errMsg);
            }
            // orientation: 'landscape'
        };
        window.plugins.streamingMedia.playVideo(path, options);
    },



    // AUDIO RELATED METHODS
    // --------------------

    captureAudio: function captureAudioFn() {
            var errorCallback = function (e) {
                console.log(e);
            }

            var successCallback = function () {
                alert('File saved successfully!');
            }

            var moveFile = function (fileUri) {
                window.resolveLocalFileSystemURL(
                    fileUri,
                    function (fileEntry) {
                        var newFileUri = cordova.file.dataDirectory;
                        var oldFileUri = fileUri;
                        var fileExt = "." + oldFileUri.split('.')[oldFileUri.split('.').length-1];
                        var ts = Math.round((new Date()).getTime() / 1000);
                        var name = prompt('Audio file name:');
                        if (name) {
                            var newFileName = name + '-' + ts + fileExt;
                            window.resolveLocalFileSystemURL(newFileUri,
                                function (fs) {
                                    fs.getDirectory('audio/', {
                                            create: true,
                                            exclusive: false
                                        },
                                        function (dirEntry) {
                                            fileEntry.moveTo(dirEntry, newFileName, successCallback, errorCallback('failed to move file'));
                                        },
                                        errorCallback('failed getting dir audio')
                                    );
                                },
                                errorCallback('new path resolve failed')
                            );
                        } else {
                            errorCallback('undefined file name');
                        }
                    },
                    errorCallback('filesystem resolve failed')
                );
            }

            // capture callback
            var captureSuccess = function (mediaFile) {
                mediaFile = JSON.parse(mediaFile);
                console.log(mediaFile.full_path);
                moveFile('file://' + mediaFile.full_path);
            };

            // capture error callback
            var captureError = function (error) {
                navigator.notification.alert('Error code: ' + error.code, null, 'Capture Error');
            };

            // start video capture
            navigator.device.audiorecorder.recordAudio(captureSuccess, captureError, 60);
        },

        playAudio: function playVideoFn(videoname) {
            var path = cordova.file.dataDirectory + "audio/" + videoname;
            var options = {
                successCallback: function () {
                    console.log("Audio was closed without error.");
                },
                errorCallback: function (errMsg) {
                    console.log("Error! " + errMsg);
                }
                // orientation: 'landscape'
            };
            window.plugins.streamingMedia.playAudio(path, options);
        }
    // --- End Wikitude Plugin ---
    };

app.initialize();