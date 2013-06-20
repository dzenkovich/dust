/**
 * @fileOverview Flying Dust music visualization. A webkit audio API experiment by Denis Zenkovich basing
 * on the canvas framework <a href="http://paperjs.org">Paper.js</a>. Audio API enhanced Music component.
 *
 * @author <a href="http://dzenkovich.com">Denis Zenkovich</a>
 * @version 0.2
 */

/**
 * Dust Namespace
 *
 * @type {Namespace}
 */
var Dust = Dust || {};

/**
 * Music deals with playing mp3 track, getting frequency equalizer and updating force of attached Breezes
 *
 * @type {Object}
 * @constructor
 * @param {Object} options An object with any of the following properties:
 * <dl>
 *     <dt>controlsId</dt><dd>Id of music controls container.</dd>
 *     <dt>loadingMessage</dt><dd>Message to show while loading sound.</dd>
 *     <dt>loadingImgUrl</dt><dd>Loading spinner image url to add to the loading message.</dd>
 *     <dt>url</dt><dd>Audio file url to load.</dd>
 *     <dt>bassCut</dt><dd>Frequency cut applied in overall magnitude calculation, specific to Bass type frequencies.</dd>
 * </dl>
 */
Dust.Music = function(options){
    options = options || {};

    if(typeof this.initialize == 'function') this.initialize(options);
};
/**
 * Music object prototype methods and properties
 * @type {Object}
 */
Dust.Music.prototype = {
    constructor: Dust.Music,

    /**
     * settings of frequency groups, each group can accept callback to be triggered with overall magnitude through the range
     */
    relation: {
        lowBass: [1, 20],
        bitBass: [10, 20],
        middleLow: [100, 150],
        middleMed: [300, 350],
        middleHigh: [400, 450],
        high: [500, 1023]
    },
    //object of callbacks on various frequencies
    on: {},

    //default options
    defaults: {
        controlsId: 'j_audio_controls',
        loadingMessage: 'Music is loading please wait ',
        loadingImgUrl: 'ajax-loader.gif',
        url: 'dust-music.mp3',
        bassCut: 200
    },
    attributes: null, //full set of options - merge of user options with defaults
    context: null, //AudioContext object
    analyser: null, //AudioContext Analyser object
    debug: null, //is debug mode
    playing: false, //is playing
    playTime: 0, //play start time
    playback: 0, //total seconds played
    controls: {}, //object with available playback controls

    /**
     * @constructs Dust.Music
     */
    initialize: function(options){
        this.attributes = Dust.Cloud.prototype._extend(Dust.Cloud.prototype._extend({}, this.defaults), options);

        var AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        this.analyser = this.context.createAnalyser();
        this.gainer = this.context.createGain();
        this.gainer.gain.value = -0.5; //mysteriously after applying analyser only 0 -> -1 values work

        this.gainer.connect(this.context.destination);
        this.analyser.connect(this.context.destination);

        this._buildControls();

        this.load(this.attributes.url);

        if(this.attributes.debug){
            this.debug = {};
            this._buildFrequencyCanvas();
        }
    },

    /**
     * Create audio playback controls and render them into container.
     *
     * @private
     */
    _buildControls: function(){
        var that = this,
            message,
            ticker,
            playPause = document.createElement('input'),
            container = document.getElementById(this.attributes.controlsId);

        message = document.createElement('div');
        message.className = 'music-loading';
        message.innerHTML = this.attributes.loadingMessage;
        ticker = document.createElement('img');
        ticker.className = 'music-loading-ticker';
        ticker.src = this.attributes.loadingImgUrl;
        message.appendChild(ticker);
        container.appendChild(message);
        message.style.display = 'none';

        playPause.type = 'button';
        playPause.value = 'play';
        playPause.disabled = true;
        playPause.className = 'play-pause';
        playPause.addEventListener('click', function(){
            that.playing ? that.stop() : that.play();
        });
        container.appendChild(playPause);

        this.controls.message = message;
        this.controls.playPause = playPause;
        this.controls.volume = new Slider({
            container: container,
            value: that.gainer.gain.value + 1,
            onChange: function(value){
                that.gainer.gain.value = value - 1;
            }
        });
    },

    /**
     * Create frequency debug canvas to plot bar chart to.
     *
     * @private
     */
    _buildFrequencyCanvas: function(){
        this.debug.canvas = document.createElement('canvas');
        this.debug.canvas.id = 'j_debug_dust_music';
        this.debug.canvas.className = 'debug';
        this.debug.canvas.height = 255;
        this.debug.canvas.width = 1024;
        this.debug.context = this.debug.canvas.getContext('2d');
        this.debug.context.fillStyle = 'green';

        document.body.appendChild(this.debug.canvas);
    },


    /**
     * Load audio file into BufferSource.
     * @param {String} url of the audio file to load.
     */
    load: function(url){
        var that = this,
            request;

        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        this.controls.message.style.display = '';

        // Decode asynchronously
        request.onload = function() {
            that.context.decodeAudioData(request.response, function(buffer) {
                that.controls.message.style.display = 'none';

                that.buffer = buffer;
                that.controls.playPause.disabled = false;
                that.play();

            }, function(){});
        }
        request.send();
    },


    /**
     * Play music.
     * AudioBufferSourceNode has no play/pause methods, this why we have to
     * recreate the AudioBufferSourceNode every time user resumes the playback
     * and start the playback at the duration user has stopped.
     */
    play: function(){
        if(this.source){
            this.source.disconnect(this.gainer);
            this.source.disconnect(this.analyser);
        }

        //recreate the buffer and reconnect plugins
        this.source = this.context.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.connect(this.gainer);
        this.source.connect(this.analyser);
        this.source.loop = true;

        //calculate the start time and play the music
        this.playTime = Date.now();
        this.controls.playPause.value = 'pause';

        if(!this.source.start) this.source.start = this.source.noteOn;
        this.source.start(0, this.playback / 1000);

        this.playing = true;
    },

    /**
     * Pause music.
     * AudioBufferSourceNode has no play/pause methods, we stop it and destroy as there
     * is no use to this before anymore.
     */
    stop: function(){
        var time = Date.now();
        this.controls.playPause.value = 'play';

        //stop the playback
        if(!this.source.stop) this.source.stop = this.source.noteOff;
        this.source.stop(0);

        //odd, but even after disconnecting, plugins still output frequency data
        this.source.disconnect(this.gainer);
        this.source.disconnect(this.analyser);
        delete this.source;

        //save played duration
        this.playback+= time - this.playTime;
        this.playing = false;
    },

    /**
     * Attach a frequency group callback action to be called every step of the playback
     * Frequency groups are assigned in this.relation
     *
     * @param {String} type Frequency group name
     * @param {Function} callback function to attach to the group
     */
    set: function(type, callback){
        if(!this.on[type]){
            this.on[type] = [];
        }

        if(typeof callback == 'function'){
            this.on[type].push(callback);
        }
    },

    /**
     * Calculate frequencies of the current playback step and call all attached listeners with overall magnitude provided
     */
    apply: function(){
        var freqByteData,
            subArr,
            sum,
            overall,
            i,
            cut,
            sumAll;

        if(!this.analyser) return;

        // Create a new array that we can copy the frequency data into
        freqByteData = new Uint8Array(this.analyser.frequencyBinCount);
        // Copy the frequency data into our new array
        this.analyser.getByteFrequencyData(freqByteData);

        if(this.attributes.debug){
            // Clear the drawing display
            this.debug.context.clearRect(0, 0, this.debug.canvas.width, this.debug.canvas.height);

            // For each "bucket" in the frequency data, draw a line corresponding to its magnitude
            for (var i = 0; i < freqByteData.length; i++) {
                this.debug.context.fillRect(i, this.debug.canvas.height - freqByteData[i], 1, this.debug.canvas.height);
            }
        }

        for(i in this.relation){
            if(i == 'bitBass' || i == 'lowBass') cut = this.attributes.bassCut;
            else cut = 0;

            sumAll = function(v){
                var red = 0;

                if(v > 0 && cut) red = ( cut * (cut/v) );
                v = v - red;
                sum+= (v > 0 ? v : 0);
            };

            if(this.relation.hasOwnProperty(i)){
                //apply frequency
                if(this.on[i]){
                    //calculate overall frequency
                    sum = 0;
                    subArr = Array.prototype.slice.apply(freqByteData, [this.relation[i][0], this.relation[i][1]]);
                    subArr.forEach(sumAll);

                    overall = sum / (this.relation[i][1] - this.relation[i][0]);

                    //"sharpen" bass related overalls
                    if(i == 'bitBass' || i == 'lowBass') overall = Math.pow(overall, 1.4);

                    this.on[i].forEach(function(callback){
                        callback(overall, i);
                    });
                }
            }
        }
    }
};