// GLOBAL VARIABLES
// ----------------
var defaultScaleValue = 0.045;
var defaultRotationValue = 0;

var rotationValues = [];
var scaleValues = [];

var allCurrentModels = [];
var allCurrentLabels = [];
var allCurrentLinks = [];
var allCurrentVideos = [];

var selectedAug;

var oneFingerGestureAllowed = false;

AR.context.on2FingerGestureStarted = function () {
    oneFingerGestureAllowed = false;
};

function rgba2hex(orig) {
    var a, isPercent,
        rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
        alpha = (rgb && rgb[4] || "").trim(),
        hex = rgb ?
        (rgb[1] | 1 << 8).toString(16).slice(1) +
        (rgb[2] | 1 << 8).toString(16).slice(1) +
        (rgb[3] | 1 << 8).toString(16).slice(1) : orig;

    if (alpha !== "") {
        a = alpha;
    } else {
        a = 01;
    }
    // multiply before convert to HEX
    a = ((a * 255) | 1 << 8).toString(16).slice(1)
    hex = hex + a;

    return hex;
}

// WORLD INIT 
// ----------
var World = {
    modelPaths: [
        "assets/models/clock.wt3",
        "assets/models/couch.wt3",
        "assets/models/officechair.wt3",
        "assets/models/table.wt3",
        "assets/models/trainer.wt3"
    ],
    /*
        RequestedModel is the index of the next model to be created. This is necessary because we have to wait one
        frame in order to pass the correct initial position to the newly created model. InitialDrag is a boolean
        that serves the purpose of swiping the model into the scene. In the moment that the model is created, the
        drag event has already started and will not be caught by the model, so the motion has to be carried out by
        the tracking plane. LastAddedModel always holds the newest model in allCurrentModels so that the plane knows
         which model to apply the motion to.
    */
    requestedModel: -1,
    initialDrag: false,
    lastAddedModel: null,

    init: function initFn() {
        // this.showUserInstructions("Running without platform assisted tracking (ARKit or ARCore).");
        World.createOverlays();
        AR.platform.sendJSONObject({
            action: "get_saved_videos"
        });

        // INIT COLOUR PICKERS
        $("#aug-text-color").spectrum({
            preferredFormat: 'rgb',
            showPalette: true,
            showAlpha: true
        });
        $("#aug-background-color").spectrum({
            preferredFormat: 'rgb',
            showPalette: true,
            showAlpha: true
        });
        setTimeout(function(){
            $('#aug-color-container .ui-input-text').css('display', 'none');
            $('.sp-replacer').css('margin', '0.5em');
        }, 200);
    },

    createOverlays: function createOverlaysFn() {

        var crossHairsRedImage = new AR.ImageResource("assets/crosshairs_red.png", {
            onError: World.onError
        });
        this.crossHairsRedDrawable = new AR.ImageDrawable(crossHairsRedImage, 1.0);

        var crossHairsBlueImage = new AR.ImageResource("assets/crosshairs_blue.png", {
            onError: World.onError
        });
        this.crossHairsBlueDrawable = new AR.ImageDrawable(crossHairsBlueImage, 1.0);

        var crossHairsGreenImage = new AR.ImageResource("assets/crosshairs_green.png", {
            onError: World.onError
        });
        this.crossHairsGreenDrawable = new AR.ImageDrawable(crossHairsGreenImage, 1.0);


        this.tracker = new AR.InstantTracker({
            onChangedState: function onChangedStateFn(state) {
                var els = [].slice.apply(document.getElementsByClassName("model-button"));
                if (state === AR.InstantTrackerState.INITIALIZING) {
                    els.forEach(function (element) {
                        element.classList.add("image-button-inactive");
                    });

                    document.getElementById("tracking-start-stop-button").src = "assets/buttons/start.png";
                    // document.getElementById("tracking-height-slider-container").style.visibility = "visible";
                    // document.getElementById("tracking-angle-slider-container").style.visibility = "visible";
                    $('#aug-controls').css('display', 'none');
                    $('#deleteButton').css('display', 'none');
                    $('#tracking-controls').css('display', 'flex');
                    $('#aug-color-container').css('display', 'none')
                } else {
                    els.forEach(function (element) {
                        element.classList.remove("image-button-inactive");
                    });

                    document.getElementById("tracking-start-stop-button").src = "assets/buttons/stop.png";
                    // document.getElementById("tracking-height-slider-container").style.visibility = "hidden";
                    // document.getElementById("tracking-angle-slider-container").style.visibility = "hidden";
                    $('#aug-controls').css('display', 'flex');
                    $('#deleteButton').css('display', 'block');
                    $('#tracking-controls').css('display', 'none');
                }
            },
            /*
                Device height needs to be as accurate as possible to have an accurate scale returned by the Wikitude
                SDK.
             */
            deviceHeight: 1.0,
            onError: World.onError,
            onChangeStateError: World.onError,
            /* SMART has to be disabled to use the save and load InstantTarget feature. */
            trackingPlaneOrientation: 0,
            smartEnabled: false
        });

        this.instantTrackable = new AR.InstantTrackable(this.tracker, {
            drawables: {
                cam: World.crossHairsBlueDrawable,
                initialization: World.crossHairsRedDrawable
            },
            onTrackingStarted: function onTrackingStartedFn() {
                /* Do something when tracking is started (recognized). */
            },
            onTrackingStopped: function onTrackingStoppedFn() {
                /* Do something when tracking is stopped (lost). */
            },
            onTrackingPlaneClick: function onTrackingPlaneClickFn(xPos, yPos) {
                /* React to a the tracking plane being clicked here. */
            },
            onTrackingPlaneDragBegan: function onTrackingPlaneDragBeganFn(xPos, yPos) {
                oneFingerGestureAllowed = true;
                World.updatePlaneDrag(xPos, yPos);
            },
            onTrackingPlaneDragChanged: function onTrackingPlaneDragChangedFn(xPos, yPos) {
                World.updatePlaneDrag(xPos, yPos);
            },
            onTrackingPlaneDragEnded: function onTrackingPlaneDragEndedFn(xPos, yPos) {
                World.updatePlaneDrag(xPos, yPos);
                World.initialDrag = false;
            },
            onError: World.onError
        });

        setInterval(
            function () {
                if (World.tracker.canStartTracking) {
                    World.instantTrackable.drawables.initialization = [World.crossHairsGreenDrawable];
                } else {
                    World.instantTrackable.drawables.initialization = [World.crossHairsRedDrawable];
                }
            },
            1000
        );

        World.setupEventListeners()
    },

    setupEventListeners: function setupEventListenersFn() {
        document.getElementById("tracking-model-button-clock").addEventListener('touchstart', function ( /*ev*/ ) {
            World.requestedModel = 0;
        }, false);
        document.getElementById("tracking-model-button-couch").addEventListener('touchstart', function ( /*ev*/ ) {
            World.requestedModel = 1;
        }, false);
        // document.getElementById("tracking-model-button-chair").addEventListener('touchstart', function( /*ev*/ ) {
        //     World.requestedModel = 2;
        // }, false);
        // document.getElementById("tracking-model-button-table").addEventListener('touchstart', function( /*ev*/ ) {
        //     World.requestedModel = 3;
        // }, false);
        // document.getElementById("tracking-model-button-trainer").addEventListener('touchstart', function( /*ev*/ ) {
        //     World.requestedModel = 4;
        // }, false);
        document.getElementById("tracking-model-button-label").addEventListener('touchstart', function ( /*ev*/ ) {
            World.requestedModel = 5;
        }, false);
        document.getElementById("tracking-model-button-link").addEventListener('touchstart', function ( /*ev*/ ) {
            World.requestedModel = 6;
        }, false);
        document.getElementById("tracking-model-button-video").addEventListener('click', function ( /*ev*/ ) {
            $("#selectVideo").selectmenu("open");

            // World.requestedModel = 7;
        }, false);
    },

    updatePlaneDrag: function updatePlaneDragFn(xPos, yPos) {
        // console.log('X:');
        // console.log(xPos);
        // console.log('Y:');
        // console.log(yPos);
        if (World.requestedModel >= 0) {
            if (World.requestedModel === 5) {
                World.addLabel("default", xPos, yPos);
                World.requestedModel = -1;
                World.initialDrag = true;
            } else if (World.requestedModel === 6) {
                World.addLink("default", xPos, yPos);
                World.requestedModel = -1;
                World.initialDrag = true;
            }
            // else if (World.requestedModel === 7) {
            // 		// World.getVideo("default", xPos, yPos);
            // 		$('#select').trigger('focus');
            // 		World.requestedModel = -1;
            // 		World.initialDrag = true;
            // } 
            else {
                World.addModel(World.requestedModel, xPos, yPos);
                World.requestedModel = -1;
                World.initialDrag = true;
            }
        }

        if (World.initialDrag && oneFingerGestureAllowed) {
            World.lastAddedModel.translate = {
                x: xPos,
                y: yPos
            };
        }
    },

    changeTrackerState: function changeTrackerStateFn() {

        if (this.tracker.state === AR.InstantTrackerState.INITIALIZING) {
            this.tracker.state = AR.InstantTrackerState.TRACKING;
        } else {
            this.tracker.state = AR.InstantTrackerState.INITIALIZING;
        }
    },

    changeTrackingHeight: function changeTrackingHeightFn(height) {
        this.tracker.deviceHeight = parseFloat(height);
    },

    changeTrackingAngle: function changeTrackingAngleFn(angle) {
        this.tracker.trackingPlaneOrientation = parseFloat(angle);
    },


    // AUGMENTATION INITIALISATION METHODS
    // -----------------------------------
    addModel: function addModelFn(pathIndex, xpos, ypos) {
        if (World.isTracking()) {
            var modelIndex = rotationValues.length;
            World.addModelValues();

            var model = new AR.Model(World.modelPaths[pathIndex], {
                scale: {
                    x: defaultScaleValue,
                    y: defaultScaleValue,
                    z: defaultScaleValue
                },
                translate: {
                    x: xpos,
                    y: ypos
                },
                onDragBegan: function ( /*x, y*/ ) {
                    oneFingerGestureAllowed = true;
                },
                onDragChanged: function (relativeX, relativeY, intersectionX, intersectionY) {
                    if (oneFingerGestureAllowed) {
                        this.translate = {
                            x: intersectionX,
                            y: intersectionY
                        };
                    }
                },
                onDragEnded: function (x, y) {
                    /* React to the drag gesture ending. */
                },
                onRotationBegan: function (angleInDegrees) {
                    /* React to the rotation gesture beginning. */
                },
                onRotationChanged: function (angleInDegrees) {
                    this.rotate.z = rotationValues[modelIndex] - angleInDegrees;
                },
                onRotationEnded: function ( /*angleInDegrees*/ ) {
                    rotationValues[modelIndex] = this.rotate.z
                },
                onScaleBegan: function (scale) {
                    /* React to the scale gesture beginning. */
                },
                onScaleChanged: function (scale) {
                    var scaleValue = scaleValues[modelIndex] * scale;
                    this.scale = {
                        x: scaleValue,
                        y: scaleValue,
                        z: scaleValue
                    };
                },
                onScaleEnded: function ( /*scale*/ ) {
                    scaleValues[modelIndex] = this.scale.x;
                },
                onClick: function () {
                    selectedAug = this;
                    $('#aug-color-container').css('display', 'none');
                },
                onError: World.onError
            });

            allCurrentModels.push(model);
            World.lastAddedModel = model;
            this.instantTrackable.drawables.addCamDrawable(model);
        }
    },

    addLabel: function addLabelFn(text, xpos, ypos) {
        if (World.isTracking()) {
            var labelIndex = rotationValues.length;
            World.addModelValues();

            var label = new AR.Label(prompt('Text:'), 0.1, {
                offsetY: 1,
                onClick: function (l) {
                    selectedAug = this;
                    $('#aug-color-container').css('display', 'block');
                },
                rotate: {
                    tilt: -90
                },
                style: {
                    backgroundColor: '#cccccc'
                },
                onDragBegan: function ( /*x, y*/ ) {
                    oneFingerGestureAllowed = true;
                },
                onDragChanged: function (relativeX, relativeY, intersectionX, intersectionY) {
                    if (oneFingerGestureAllowed) {
                        this.translate = {
                            x: intersectionX,
                            y: intersectionY
                        };
                    }
                },
                onDragEnded: function (x, y) {
                    /* React to the drag gesture ending. */
                },
                onRotationBegan: function (angleInDegrees) {
                    /* React to the rotation gesture beginning. */
                },
                onRotationChanged: function (angleInDegrees) {
                    this.rotate.z = rotationValues[labelIndex] - angleInDegrees;
                },
                onRotationEnded: function ( /*angleInDegrees*/ ) {
                    rotationValues[labelIndex] = this.rotate.z
                },
                onScaleBegan: function (scale) {
                    /* React to the scale gesture beginning. */
                },
                onScaleChanged: function (scale) {
                    var scaleValue = scaleValues[labelIndex] * scale;
                    this.scale = {
                        x: scaleValue,
                        y: scaleValue,
                        z: scaleValue
                    };
                },
                onScaleEnded: function ( /*scale*/ ) {
                    scaleValues[labelIndex] = this.scale.x;
                },
                onError: World.onError
            });

            allCurrentLabels.push(label);
            World.lastAddedModel = label;
            this.instantTrackable.drawables.addCamDrawable(label);
        }
    },

    addLink: function addLabelFn(text, xpos, ypos) {
        if (World.isTracking()) {
            var labelIndex = rotationValues.length;
            World.addModelValues();

            var label = prompt('Link label:');
            var url = prompt('URL', 'http://');

            var link = new AR.Label(label, 0.1, {
                offsetY: 1,
                onClick: function (l) {
                    selectedAug = this;
                    AR.context.openInBrowser(url);
                    $('#aug-color-container').css('display', 'block');
                },
                rotate: {
                    tilt: -90
                },
                style: {
                    backgroundColor: '#cccccc'
                },
                onDragBegan: function ( /*x, y*/ ) {
                    oneFingerGestureAllowed = true;
                },
                onDragChanged: function (relativeX, relativeY, intersectionX, intersectionY) {
                    if (oneFingerGestureAllowed) {
                        this.translate = {
                            x: intersectionX,
                            y: intersectionY
                        };
                    }
                },
                onDragEnded: function (x, y) {
                    /* React to the drag gesture ending. */
                },
                onRotationBegan: function (angleInDegrees) {
                    /* React to the rotation gesture beginning. */
                },
                onRotationChanged: function (angleInDegrees) {
                    this.rotate.z = rotationValues[labelIndex] - angleInDegrees;
                },
                onRotationEnded: function ( /*angleInDegrees*/ ) {
                    rotationValues[labelIndex] = this.rotate.z
                },
                onScaleBegan: function (scale) {
                    /* React to the scale gesture beginning. */
                },
                onScaleChanged: function (scale) {
                    var scaleValue = scaleValues[labelIndex] * scale;
                    this.scale = {
                        x: scaleValue,
                        y: scaleValue,
                        z: scaleValue
                    };
                },
                onScaleEnded: function ( /*scale*/ ) {
                    scaleValues[labelIndex] = this.scale.x;
                },
                onError: World.onError
            });

            var aug = {
                link: link,
                url: url
            }

            allCurrentLinks.push(aug);
            World.lastAddedModel = link;
            this.instantTrackable.drawables.addCamDrawable(link);

            console.log(link);

        }
    },

    addVideo: function addVideoFn(path, xpos, ypos) {
        console.log('addVideo triggered');
        // console.log(xpos);
        // console.log(ypos);
        if (World.isTracking()) {
            var labelIndex = rotationValues.length;
            World.addModelValues();

            var video = new AR.VideoDrawable(path, 1, {
                offsetY: 0,
                // onClick: function (l) {
                // 	l.play();
                // },
                rotate: {
                    // tilt: -90
                    // roll: 90
                },
                style: {
                    backgroundColor: '#cccccc'
                },
                onDragBegan: function ( /*x, y*/ ) {
                    oneFingerGestureAllowed = true;
                },
                onDragChanged: function (relativeX, relativeY, intersectionX, intersectionY) {
                    if (oneFingerGestureAllowed) {
                        // Setting all three values of translate/scale/rotate at once is more efficient 
                        this.translate = {
                            x: intersectionX,
                            y: intersectionY
                        };
                    }
                },
                onDragEnded: function (x, y) {
                    /* React to the drag gesture ending. */
                },
                onRotationBegan: function (angleInDegrees) {
                    /* React to the rotation gesture beginning. */
                },
                onRotationChanged: function (angleInDegrees) {
                    this.rotate.z = rotationValues[labelIndex] - angleInDegrees;
                },
                onRotationEnded: function ( /*angleInDegrees*/ ) {
                    rotationValues[labelIndex] = this.rotate.z
                },
                onScaleBegan: function (scale) {
                    /* React to the scale gesture beginning. */
                },
                onScaleChanged: function (scale) {
                    var scaleValue = scaleValues[labelIndex] * scale;
                    this.scale = {
                        x: scaleValue,
                        y: scaleValue,
                        z: scaleValue
                    };
                },
                onScaleEnded: function ( /*scale*/ ) {
                    scaleValues[labelIndex] = this.scale.x;
                },
                onError: World.onError
            });

            video.onClick = function () {
                selectedAug = this;
                $('#aug-color-container').css('display', 'none');
                video.play();
            };

            video.uri = path;

            allCurrentVideos.push(video);
            World.lastAddedModel = video;
            this.instantTrackable.drawables.addCamDrawable(video);

            console.log(video);

        }
    },


    // NATIVE GETTERS
    // --------------
    getVideo: function getVideoFn(videoname, xPos, yPos) {
        AR.platform.sendJSONObject({
            action: "get_video_absolute_path",
            name: videoname,
            xPos: 1,
            yPos: 1
        });
        $("#selectVideo").selectmenu("close");

    },

    getVideos: function getVideosFn(data) {
        console.log(data);
        if (data.length === 0) {

        } else {
            for (var i = 0; i < data.length; i++) {
                console.log("file.name " + data[i].name);
                $('#selectVideo').append("<option value='" + data[i].name + "'>" + data[i].name + "</li>").selectmenu('refresh');
                // $('#select').append("<input type='radio' name='load' id='" + data[i].name + "' value='" + data[i].name +"'><label for='"+data[i].name+"'>"+data[i].name+"</label>");
            }
            // $('#select').trigger('change');
            // $('input[type=radio]').checkboxradio().trigger('create');
            // $('a.ui-btn').button().trigger('create');
        }
    },




    // RESET METHODS
    // -------------
    resetModels: function resetModelsFn() {
        this.instantTrackable.drawables.removeCamDrawable(allCurrentModels);
        this.instantTrackable.drawables.removeCamDrawable(allCurrentLabels);
        this.instantTrackable.drawables.removeCamDrawable(allCurrentLinks);
        this.instantTrackable.drawables.removeCamDrawable(allCurrentVideos);

        allCurrentModels = [];
        allCurrentLabels = [];
        allCurrentLinks = [];
        allCurrentVideos = [];
        World.resetAllModelValues();
    },

    resetAllModelValues: function resetAllModelValuesFn() {
        rotationValues = [];
        scaleValues = [];
    },



    // TARGET SAVE METHODS
    // -------------------
    saveCurrentInstantTarget: function saveCurrentInstantTargetFn() {
        let name = prompt('Target name:');

        var augmentations = [];

        allCurrentModels.forEach(function (model) {
            augmentations.push({
                type: '3d',
                uri: model.uri,
                translate: model.translate,
                rotate: model.rotate,
                scale: model.scale
            });
        });

        allCurrentLabels.forEach(function (label) {
            augmentations.push({
                type: 'label',
                label: label
            });
        });

        allCurrentLinks.forEach(function (link) {
            augmentations.push({
                type: 'link',
                link: link.link,
                url: link.url
            });
        });

        allCurrentVideos.forEach(function (video) {
            augmentations.push({
                type: 'video',
                uri: video.uri,
                video: video
            });
        });

        if (this.tracker.state === AR.InstantTrackerState.TRACKING) {
            AR.platform.sendJSONObject({
                action: "save_instant_target",
                // action: "save_current_instant_target",
                name: name,
                augmentations: JSON.stringify(augmentations)
            });
        } else {
            alert("Save instant target [" + name + "] is only available while tracking.")
        }
    },

    /* Called from platform specific part of the sample. */
    saveCurrentInstantTargetToUrl: function saveCurrentInstantTargetToUrlFn(url) {
        console.log(url);
        this.tracker.saveCurrentInstantTarget(url, function () {
            alert("Saving target was successful");
        }, function (error) {
            alert("Saving failed: " + error);
        })
    },



    // UTILITY METHODS
    // ---------------
    onError: function onErrorFn(error) {
        alert(error)
    },

    showUserInstructions: function showUserInstructionsFn(message) {
        document.getElementById('loadingMessage').innerHTML = message;
    },

    isTracking: function isTrackingFn() {
        return (this.tracker.state === AR.InstantTrackerState.TRACKING);
    },

    addModelValues: function addModelValuesFn() {
        rotationValues.push(defaultRotationValue);
        scaleValues.push(defaultScaleValue);
    },

    



    // AUGMENTATION CONTROL METHODS
    // ----------------------------
    selectedRotateX: function (degrees) {
        if (typeof selectedAug !== 'undefined') {
            selectedAug.rotate.x = parseInt(degrees);
        }
    },
    selectedRotateY: function (degrees) {
        if (typeof selectedAug !== 'undefined') {
            selectedAug.rotate.y = parseInt(degrees);
        }
    },
    selectedRotateZ: function (degrees) {
        if (typeof selectedAug !== 'undefined') {
            selectedAug.rotate.z = parseInt(degrees);
        }
    },
    selectedTranslateZ: function (degrees) {
        if (typeof selectedAug !== 'undefined') {
            selectedAug.translate.z = parseFloat(degrees);
        }
    },
    selectedScale: function (factor) {
        if (typeof selectedAug !== 'undefined') {
            selectedAug.scale = {
                x: parseFloat(factor),
                y: parseFloat(factor),
                z: parseFloat(factor)
            };
        }

    },
    selectedFontColor: function (rgba) {
        if (typeof selectedAug !== 'undefined') {
            var hex = rgba2hex(rgba);
            // console.log(hex);
            selectedAug.style.textColor = '#'+hex;
        }
    },
    selectedBackgroundColor: function (rgba) {
        if (typeof selectedAug !== 'undefined') {
            var hex = rgba2hex(rgba);
            // console.log(hex);
            selectedAug.style.backgroundColor = '#'+hex;
        }
    },
    selectedDestroy: function() {
        if (typeof selectedAug !== 'undefined') {
            selectedAug.destroy();
        }
    }
};

World.init();