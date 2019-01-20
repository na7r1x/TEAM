var rotationValues = [];
var scaleValues = [];

var oneFingerGestureAllowed = false;

/*
    This global callback can be utilized to react on the transition from and to 2 finger gestures; specifically, we
    disallow the drag gesture in this case to ensure an intuitive experience.
*/
AR.context.on2FingerGestureStarted = function() {
    oneFingerGestureAllowed = false;
};

var World = {

    drawables: [],
    drawablesArrays: [],
    trackers: [],
    trackables: [],

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

    // loadExistingInstantTarget: function loadExistingInstantTargetFn() {
    //     AR.platform.sendJSONObject({
    //         action: "load_existing_instant_target"
    //     });
    // },

    loadExistingInstantTarget: function loadExistingInstantTargetFn(name) {
        name = name.split('.');
        AR.platform.sendJSONObject({
            action: "load_instant_target",
            name: name[0]
        });
    },

    loadExistingInstantTargets: function loadExistingInstantTargetFn() {
      // reset
        $(this.trackables).each(function(index, el) {
          el.drawables.removeCamDrawable(World.drawablesArrays[index]);
        });
        // World.instantTrackable.drawables.removeCamDrawable(World.drawables);
        World.drawablesArrays.forEach(function(drawableArray) {
          drawableArray.forEach(function(drawable) {
            drawable.destroy();
          });
        });
        $(this.trackers).each(function(index, el) {
          el.destroy();
        });
        this.trackers = [];
        $('input:checkbox:checked').each(function(index, el) {
          var name = $(el).attr('id');
          name = name.split('.');
          AR.platform.sendJSONObject({
            action: "load_instant_targets",
            name: name[0]
          });
        });
    },

    /* Called from platform specific part */
    loadExistingInstantTargetsFromUrl: function loadExistingInstantTargetFromUrlFn(url, augmentations) {
        var thisTracker = World.trackers.push(new AR.InstantTracker({
            /*
                Device height needs to be as accurate as possible to have an accurate scale returned by the Wikitude
                SDK.
             */
            deviceHeight: 1.0,
            onError: World.onError,
            smartEnabled: false
        }));
        console.log("this Tracker: " + thisTracker);
        var thisTrackable = World.trackables.push(new AR.InstantTrackable(World.trackers[thisTracker-1], {
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
        }));
        var thisDrawables = this.drawablesArrays.push([]);
        var mapResource = new AR.TargetCollectionResource(url);
        World.trackers[thisTracker-1].loadExistingInstantTarget(mapResource, function() {
            augmentations.forEach(function(model) {
                if (model.type === '3d') {
                  World.drawablesArrays[thisDrawables-1].push(new AR.Model(model.uri, {
                    translate: model.translate,
                    rotate: model.rotate,
                    scale: model.scale,
                    onError: World.onError
                  }));
                } else if (model.type === 'label') {
                  model.label.height = 0.1;
                  World.drawablesArrays[thisDrawables-1].push(new AR.Label(model.label.text, model.label.height, model.label));
                }
            });
            World.trackables[thisTrackable-1].drawables.addCamDrawable(World.drawablesArrays[thisDrawables-1]);
            alert("Loading was successful");
            console.log(World.trackers);
            console.log(World.trackables);
            console.log(World.drawablesArrays);
        }, function(error) {
            alert("Loading failed: " + error);
        }, {
            expansionPolicy: AR.CONST.INSTANT_TARGET_EXPANSION_POLICY.ALLOW_EXPANSION
        })
    },

    /* Called from platform specific part */
    loadExistingInstantTargetFromUrl: function loadExistingInstantTargetFromUrlFn(url, augmentations) {
        var mapResource = new AR.TargetCollectionResource(url);
        this.tracker.loadExistingInstantTarget(mapResource, function() {

            World.instantTrackable.drawables.removeCamDrawable(World.drawables);
            World.drawables.forEach(function(drawable) {
                drawable.destroy();
            });
            World.drawables = [];

            augmentations.forEach(function(model) {
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
                }
            });
            World.instantTrackable.drawables.addCamDrawable(World.drawables);
            alert("Loading was successful");
        }, function(error) {
            alert("Loading failed: " + error);
        }, {
            expansionPolicy: AR.CONST.INSTANT_TARGET_EXPANSION_POLICY.ALLOW_EXPANSION
        })
    },

    onError: function onErrorFn(error) {
        /* onError might be called from native platform code and some devices require a delayed scheduling of the alert to get it focused. */
        setTimeout(function() {
            alert(error);
        }, 0);
    },

    showUserInstructions: function showUserInstructionsFn(message) {
        document.getElementById('loadingMessage').innerHTML = message;
    },

    getTargets: function getTargetsFn(data) {
      console.log(data);
      if (data.length === 0) {

      } else {
        for (var i = 0; i < data.length; i++) {
          console.log("file.name " + data[i].name);
          // $('#select').append("<option value='"+data[i].name+"'>"+data[i].name+"</li>").selectmenu('refresh');
          $('#select').append("<input type='checkbox' id='"+data[i].name+"'><label for='"+data[i].name+"'>"+data[i].name+"</label>");
        }
        $('input[type=checkbox]').checkboxradio().trigger('create');
        $('a.ui-btn').button().trigger('create');
      }
    }
};

World.init();
