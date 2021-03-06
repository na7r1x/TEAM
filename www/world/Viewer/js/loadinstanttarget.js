// GLOBAL VARIABLES
// ----------------
var rotationValues = [];
var scaleValues = [];

var oneFingerGestureAllowed = false;


AR.context.on2FingerGestureStarted = function () {
    oneFingerGestureAllowed = false;
};

var World = {

    drawables: [],

    init: function initFn() {
        var message = "Running without platform assisted tracking (ARKit or ARCore).";

        // this.showUserInstructions(message);
        this.createOverlays();
        AR.platform.sendJSONObject({
            action: "get_saved_models"
        });
    },

    createOverlays: function createOverlaysFn() {
        var crossHairsBlueImage = new AR.ImageResource("assets/crosshairs_blue.png");
        this.crossHairsBlueDrawable = new AR.ImageDrawable(crossHairsBlueImage, 1.0);

        this.tracker = new AR.InstantTracker({
            /*
                Device height needs to be as accurate as possible to have an accurate scale returned by the Wikitude
                SDK.
             */
            deviceHeight: 1.0,
            onError: World.onError,
            smartEnabled: false
        });

        this.instantTrackable = new AR.InstantTrackable(this.tracker, {
            drawables: {
                cam: World.crossHairsBlueDrawable
            },
            onTrackingStarted: function onTrackingStartedFn() {
                /* Do something when tracking is started (recognized). */
            },
            onTrackingStopped: function onTrackingStoppedFn() {
                /* Do something when tracking is stopped (lost). */
            },
            onError: World.onError
        });
    },

    


    // CALL TO NATIVE
    // --------------
    loadExistingInstantTarget: function loadExistingInstantTargetFn(name) {
        name = name.split('.');
        AR.platform.sendJSONObject({
            action: "load_instant_target",
            name: name[0]
        });
    },

    loadExistingInstantTargets: function loadExistingInstantTargetsFn() {
        World.instantTrackable.drawables.removeCamDrawable(World.drawables);
        World.drawables.forEach(function (drawable) {
            drawable.destroy();
        });
        World.drawables = [];
        $('input:radio:checked').each(function (index, el) {
            var name = $(el).attr('id');
            name = name.split('.');
            AR.platform.sendJSONObject({
                action: "load_instant_target",
                name: name[0]
            });
        });
    },




    // CALLBACKS FOR NATIVE RESPONSE
    // -----------------------------
    /* Called from platform specific part */
    loadExistingInstantTargetFromUrl: function loadExistingInstantTargetFromUrlFn(url, augmentations) {
        var mapResource = new AR.TargetCollectionResource(url);
        this.tracker.loadExistingInstantTarget(mapResource, function () {

            World.instantTrackable.drawables.removeCamDrawable(World.drawables);
            World.drawables.forEach(function (drawable) {
                drawable.destroy();
            });
            World.drawables = [];

            augmentations.forEach(function (model) {
                if (model.type === '3d') {
                    World.drawables.push(new AR.Model(model.uri, {
                        translate: model.translate,
                        rotate: model.rotate,
                        scale: model.scale,
                        onError: World.onError
                    }));
                } else if (model.type === 'label') {
                    model.label.height = 0.1;
                    World.drawables.push(new AR.Label(model.label.text, model.label.height, model.label));
                } else if (model.type === 'link') {
                    model.link.height = 0.1;
                    console.log(model);
                    var newDrawable = new AR.Label(model.link.text, model.link.height, model.link);
                    newDrawable.onClick = function () {
                        AR.context.openInBrowser(model.url);
                    };
                    World.drawables.push(newDrawable);
                } else if (model.type === 'video') {
                    model.video.height = 1;
                    console.log(model);
                    var newDrawable = new AR.VideoDrawable(model.uri, model.video.height, model.video);
                    newDrawable.onClick = function () {
                        newDrawable.play();
                    };
                    World.drawables.push(newDrawable);
                } else if (model.type === 'html') {
                    model.object.height = 1;
                    console.log(model);
                    var newDrawable = new AR.HtmlDrawable({html:model.html}, model.object.height, model.object);
                    newDrawable.clickThroughEnabled = true;
                    newDrawable.onClick = function () {
                        console.log(newDrawable);
                    };
                    World.drawables.push(newDrawable);
                }
            });
            World.instantTrackable.drawables.addCamDrawable(World.drawables);
            alert("Loading was successful");
        }, function (error) {
            alert("Loading failed: " + error);
        }, {
            expansionPolicy: AR.CONST.INSTANT_TARGET_EXPANSION_POLICY.ALLOW_EXPANSION
        })
    },




    // UTILITY METHODS
    // ---------------
    onError: function onErrorFn(error) {
        /* onError might be called from native platform code and some devices require a delayed scheduling of the alert to get it focused. */
        setTimeout(function () {
            alert(error);
        }, 0);
    },

    showUserInstructions: function showUserInstructionsFn(message) {
        document.getElementById('loadingMessage').innerHTML = message;
    },




    // GETTER METHODS
    // --------------
    getTargets: function getTargetsFn(data) {
        console.log(data);
        if (data.length === 0) {

        } else {
            for (var i = 0; i < data.length; i++) {
                console.log("file.name " + data[i].name);
                $('#select').append("<option value='" + data[i].name + "'>" + data[i].name + "</li>").selectmenu('refresh');
                // $('#select').append("<input type='radio' name='load' id='" + data[i].name + "' value='" + data[i].name +"'><label for='"+data[i].name+"'>"+data[i].name+"</label>");
            }
            $('#select').trigger('change');
            // $('input[type=radio]').checkboxradio().trigger('create');
            // $('a.ui-btn').button().trigger('create');
        }
    }
};

World.init();