/**
 * @fileOverview Flying Dust music visualization. A webkit audio API experiment by Denis Zenkovich.
 * Single speck of dust component.
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
 * The speck of dust, gets random density and weight which form it's size and opacity
 *
 * @type {Object}
 * @constructor
 * @param {Object} options An object with any of the following properties:
 * <dl>
 *     <dt>position</dt><dd>Object of x and y speck coordinates relative to middle of the view-port
 *     (z coordinate also possible for parallax effect).</dd>
 *     <dt>position</dt><dd>Object of x and y axis values of speck's starting position.</dd>
 *     <dt>inertia</dt><dd>Object of x and y axis values of speck's starting inertia.</dd>
 *     <dt>color</dt><dd>Color speck would take at full density (opacity = 1).</dd>
 * </dl>
 */
Dust.Speck = function(options){
    if(typeof this.initialize == 'function') this.initialize(options);
};

/**
 * Speck object prototype methods and properties
 * @type {Object}
 */
Dust.Speck.prototype = {
    //revert constructor property
    constructor: Dust.Speck,

    basics: {
        minLife: 3,
        maxLife: 5,
        minDensity: 0.2,
        maxDensity: 1,
        minWeight: 0.5,
        maxWeight: 5,
        radiusScale: 10,
        zFactor: 0.8,
        fallFactor: 700, //Xpx for most density speck in second
        startInertiaFactor: 10,
        inertiaFallback: 0.5, //% inertia decrease per second for biggest size
        flashMaxAngle: Math.PI/4, //maximum angle of the end life flash
        flashMaxRotateAngle: Math.PI/8, //maximum end life flash rotate angle
        flashTime: 0.4, //seconds of the flash-like animation at the end of life
        maxColorMagnitude: 160, //max color magnitude speck starts flashing color
        waveLag: 0.45, //x seconds for wave to come back
        wavePrecision: 1/60 //delta to check for back wave effect
    },
    time: null,
    //default attributes
    defaults: {
        color: '#a74599'
    },
    attributes: {}, //full set of options - merge of user options with defaults
    inertia: {}, //inertia values for all axes
    force: {}, //force values for all axes
    gravity: null, //gravity value
    wave: null, //counter wave for the main power, as if dot attempts to come back
    forDebug: null, //object with debug data
    start: null, //start of speck life period

    /**
     * @constructs Dust.Speck
     */
    initialize: function(options){
        if(options){
            this.reset(options);
        }
    },

    /**
     * Reset speck attributes with the ones provided in options.
     *
     * @param {Object} options object with various speck starting parameters.
     */
    reset: function(options){
        this.attributes = {};
        this.wave = []; //reset so it doesn't get static across breezes
        //starter force, gravity is set at generate after we create density
        this.force = {
            x: 0,
            y: 0,
            z: 0 //no breezes for z axis yet
        };
        this.start = new Date().getTime(); //start of speck life period
        //if inertia provided
        if(options.inertia){
            this.inertia = Dust.Cloud.prototype._extend({}, options.inertia);
            delete options.inertia;
        }
        //random starting inertia, ranges from -startInertiaFactor to +startInertiaFactor
        else {
            this.inertia = {
                x: this.basics.startInertiaFactor * (Math.random() - 1 / 2) * 2,
                y: this.basics.startInertiaFactor * (Math.random() - 1 / 2) * 2,
                z: this.basics.startInertiaFactor * (Math.random() - 1 / 2) * 2
            };
        }

        //merge options with defaults into a new attributes object
        this.attributes = Dust.Cloud.prototype._extend(Dust.Cloud.prototype._extend({}, this.defaults), options);

        this.generate();
    },

    /**
     * generate speck specific properties: size, form, position and etc
     */
    generate: function(){
        this.attributes.life = Math.random() * (this.basics.maxLife - this.basics.minLife) + this.basics.minLife;
        this.attributes.lifeLeft = this.attributes.life;
        this.attributes.flashAngle = Math.random() * this.basics.flashMaxAngle;
        this.attributes.flashRotateAngle = Math.random() * this.basics.flashMaxRotateAngle;
        this.attributes.wieght = Math.random() * (this.basics.maxWeight - this.basics.minWeight) + this.basics.minWeight;
        this.attributes.density = Math.random() * (this.basics.maxDensity - this.basics.minDensity) + this.basics.minDensity;
        this.attributes.radius = this.basics.radiusScale * Math.pow((this.attributes.wieght / this.attributes.density) / (Math.PI * 4 / 3), 1/3);

        //set gravity force
        this.gravity = this.basics.fallFactor * this.attributes.density;
        this.force.y = this.gravity;
    },

    /**
     * Animate speck, calculates the inertia change by applying force and back wave force and moves the canvas element
     */
    fly: function(dt){
        var inertia = this.inertia,
            delta = {};

        this.attributes.lifeLeft-= dt;
        if(this.isDead()){ //quit if speck is dead
            return;
        }
        //update flash time if speck is at the end of it's life
        if(this.attributes.lifeLeft <= this.basics.flashTime){
            this.attributes.flashLifePart = 1 - this.attributes.lifeLeft / this.basics.flashTime;
        }

        this.force.y+= this.gravity;

        //apply inertia fallback
        inertia.x = (inertia.x < 0?-1:1) * (Math.abs(inertia.x) - Math.abs(inertia.x * this.basics.inertiaFallback * dt));
        inertia.y = (inertia.y < 0?-1:1) * (Math.abs(inertia.y) - Math.abs(inertia.y * this.basics.inertiaFallback * dt));
        inertia.z = (inertia.z < 0?-1:1) * (Math.abs(inertia.z) - Math.abs(inertia.z * this.basics.inertiaFallback * dt));
        //apply forces to inertia
        inertia.x+= this.force.x * dt;
        inertia.y+= this.force.y * dt;
        inertia.z+= this.force.z * dt;

        if(this.inDebug){
            this._plotPower(this.force.y, dt);
            this._plotInertia(inertia.y, dt);
        }

        //reset all forces after they were applied
        this.force = {x: 0, y: 0, z: 0};

        delta.x = inertia.x * dt;
        delta.y = inertia.y * dt;
        delta.z = inertia.z * dt;

        this.attributes.position.x+= delta.x;
        this.attributes.position.y+= delta.y;
        this.attributes.position.z+= delta.z;
    },

    /**
     * Update speck color accordingly to the given magnitude, if magnitude is greater then the basics.maxColorMagnitude
     * speck starts flashing color by changing hue component
     *
     * @param {Number} magnitude color magnitude
     */
    color: function(magnitude){
        var max = this.basics.maxColorMagnitude;

        this.attributes.colorSaturation = magnitude/max;
    },

    /**
     * Set force and back force values for the speck, speck saves back force into this.wave array to apply it later on
     * when time corresponding to basics.waveLag has passed
     *
     * @param {Object} direct object of x and y of direct force values
     * @param {Object} back object of x and y of back force values
     */
    setForce: function(direct, back){
        var wavePiece,
            time = new Date().getTime();

        this.wave.push({ time: time + this.basics.waveLag * 1000, power: back });

        //if speck suffers back force at the very moment -> apply it
        if(this.wave[0] && this.wave[0].time < (time + this.basics.wavePrecision * 1000)){
            wavePiece = this.wave.shift();
            direct.x += wavePiece.power.x;
            direct.y += wavePiece.power.y;
        }

        this.force.x = direct.x;
        this.force.y = direct.y;
    },

    /**
     * Check if speck is still active
     *
     * @returns {Boolean} dead/active
     */
    isDead: function(){
        return this.attributes.lifeLeft <= 0
    },

    /**
     * Reduce the speck's life so it immediately starts 'dieing'
     */
    shortenLife: function(){
        if(this.attributes.lifeLeft > this.basics.flashTime){
            this.attributes.lifeLeft = this.basics.flashTime;
        }
    },

    /**
     * Enable speck debugging, set's color to red, outputs inertia and power into cavas charts
     * @param {Boolean} on
     */
    debug: function(on){
        this.inDebug = on;

        if(this.inDebug){
            this.attributes.color = '#ff0000';
        }

        this.forDebug = {}; //we need to reset object so it doesn't get static to all specks
        this.forDebug.canvasPower = document.getElementById('debug-power');
        this.forDebug.canvasInertia = document.getElementById('debug-inertia');
        this.forDebug.powerMaxH = this.forDebug.canvasPower.offsetHeight / 2;
        this.forDebug.inertiaMaxH = this.forDebug.canvasInertia.offsetHeight / 2;
        this.forDebug.canvasPower = this.forDebug.canvasPower.getContext('2d');
        this.forDebug.canvasInertia = this.forDebug.canvasInertia.getContext('2d');
        this.forDebug.canvasPower.fillStyle = "red";
        this.forDebug.canvasInertia.fillStyle = "orange";
        this.forDebug.maxPower = 100;
        this.forDebug.maxInertia = 100;
        this.forDebug.powerLastX = 0;
        this.forDebug.inertiaLastX = 0;
    },

    /**
     * Draw power bars at canvas chart
     *
     * @param {Number} power
     * @param {Number} frame
     * @private
     */
    _plotPower: function(power, frame){
        var width,
            height,
            y;

        width = frame * (10); //1px for 0.1 second;
        height = this.forDebug.powerMaxH * power / this.forDebug.maxPower;
        y = (height < 0 ? this.forDebug.powerMaxH + height : this.forDebug.powerMaxH)

        this.forDebug.canvasPower.fillRect(this.forDebug.powerLastX, y, width, Math.abs(height));
        this.forDebug.powerLastX+= width;
    },

    /**
     * Draw inertia bars at canvas chart
     *
     * @param {Number} inertia
     * @param {Number} frame
     * @private
     */
    _plotInertia: function(inertia, frame){
        var width,
            height,
            y;

        width = frame * (10); //1px for 0.1 second;
        height = this.forDebug.inertiaMaxH * inertia / this.forDebug.maxInertia;
        y = (height < 0 ? this.forDebug.inertiaMaxH + height : this.forDebug.inertiaMaxH)

        this.forDebug.canvasInertia.fillRect(this.forDebug.inertiaLastX, y, width, Math.abs(height));
        this.forDebug.inertiaLastX+= width;
    }
};