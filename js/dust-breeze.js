/**
 * @fileOverview Flying Dust music visualization. A webkit audio API experiment by Denis Zenkovich.
 * Wind-like force that can affect specks component.
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
 * Breeze emulates a wind from one of the sides of visible area
 * !Breeze is 2D only for now!
 *
 * @type {Object}
 * @constructor
 * @param {Object} options An object with any of the following properties:
 * <dl>
 *     <dt>type</dt><dd>direction of breeze: "up", "down", "left" or "right".</dd>
 *     <dt>power</dt><dd>breeze constant power (if not periodically updated elsewhere).</dd>
 *     <dt>musicFactor</dt><dd>Music power multiplier.</dd>
 *     <dt>size</dt><dd>Size .</dd>
 *     <dt>waveSpreadMin</dt><dd>min % of back wave going to opposite axis.</dd>
 *     <dt>waveSpreadMax</dt><dd>max % of back wave going to opposite axis.</dd>
 * </dl>
 */
Dust.Breeze = function(options){
    options = options || {};

    if(typeof this.initialize == 'function') this.initialize(options);
};
/**
 * Breeze object prototype methods and properties
 * @type {Object}
 */
Dust.Breeze.prototype = {
    //revert constructor property
    constructor: Dust.Breeze,

    //default options
    defaults: {
        type: 'up', //direction of breeze
        power: {
            x: 10, //Xpx per second in the main current
            y: 30 //Xpx per second in the main current
        },
        musicFactor: 4, //music power multiplier
        size: 50, //height of the current in px
        waveSpreadMin: 0.2, //min % of back wave going to opposite axis
        waveSpreadMax: 0.5 //max % of back wave going to opposite axis
    },
    direction: 'y', //breeze default axis
    attributes: null, //will be mixed from defaults and options passed
    view: null, //screen sizes
    backPower: null, //calculated moment back power used in Speck to provide aka bounce back move

    /**
     * @constructs Dust.Breeze
     */
    initialize: function(options){
        this.attributes = Dust.Cloud.prototype._extend(Dust.Cloud.prototype._extend({}, this.defaults), options);
        this.attributes.power = Dust.Cloud.prototype._extend({}, this.attributes.power); //reset so it doesn't get static across breezes
        this.backPower = { //reset so it doesn't get static across breezes
            x: 0,
            y: 0
        };

        //change direction in case of horizontal type
        if(this.attributes.type == 'right' || this.attributes.type == 'left'){
            this.direction = 'x';
        }

        this._saveSize(options.size);
        window.addEventListener('resize', this._saveSize.bind(this));
    },

    /**
     * Apply breeze force to a provided {@link Dust.Speck}, assigns speck new force values and the back-power for bounce back action
     * @param {Object} speck {@link Dust.Speck}
     */
    apply: function(speck){
        var x = {},
            y = {};

        x = this._findForce('x', this._findDistance('x', speck), this.view.halfW * 2);
        y = this._findForce('y', this._findDistance('y', speck), this.view.halfH * 2);

        speck.setForce({x: x.direct, y: y.direct}, {x: x.back, y: y.back});
    },

    /**
     * Update breeze power, used in conjunction with {@link Dust.Music}
     * @param {Number} overall calculated power
     */
    setPower: function(overall){
        var force,
            power = {},
            backForce = {},
            spread;

        force = overall * this.attributes.musicFactor;

        //get the part of the back force that will spread to opposite axis
        spread = force * (Math.random() * (this.attributes.waveSpreadMax - this.attributes.waveSpreadMin) + this.attributes.waveSpreadMin);

        backForce.x = ( this.direction == 'x'? force - spread : spread );
        backForce.y = ( this.direction == 'y'? force - spread : spread );

        power.x = ( this.direction == 'x'? force : 0 );
        power.y = ( this.direction == 'y'? force : 0 );

        this.attributes.power = power;
        this.backPower = backForce;
    },

    /**
     * update view-port size metrics
     *
     * @param {Object} viewPort object with scene sizes
     * @private
     */
    _saveSize: function(viewPort){
        this.view = {
            h: viewPort.height,
            w: viewPort.width,
            halfH: viewPort.height/2,
            halfW: viewPort.width/2
        }
    },

    /**
     * Find the distance between breeze wind start point and the Dust.Speck position
     *
     * @param {String} axis x or y axis to check for
     * @param {Object} speck Dust.Speck object
     * @return {Number} pixel distance from flow start to the speck
     * @private
     */
    _findDistance: function (axis, speck) {
        var distance = null;

        if (axis == 'y') {
            if (this.attributes.type == 'up') {
                distance = this.view.halfH - speck.attributes.position.y;
            }
            if (this.attributes.type == 'down') {
                distance = this.view.halfH + speck.attributes.position.y;
            }
        }

        if (axis == 'x') {
            if (this.attributes.type == 'right') {
                distance = this.view.halfW - speck.attributes.position.x;
            }
            if (this.attributes.type == 'left') {
                distance = this.view.halfW + speck.attributes.position.x;
            }
        }

        return distance;
    },

    /**
     * Calculates the force to apply for the given speck and it's distance,
     * Breeze force fade out through the full length of the view-port
     *
     * @param {String} axis x or y axis to check for
     * @param {Number} distance pixel distance from flow start to the speck
     * @param {Number} full full pixel distance from flow start to the opposite side
     * @return {Object} power object containing direct and back power for the given axis
     * @private
     */
    _findForce: function(axis, distance, full){
        var power = {},
            force = 0,
            k = 1; //force coefficient

        power.direct = 0;
        power.back = 0;

        if(distance < 0) distance = 0;

        //stream force calculation
        if (this.direction == axis) {
            if (distance < full) {
                k = Math.sqrt(Math.abs((distance / full) - 1));
            }
            if (this.attributes.type == 'up' || this.attributes.type == 'left') {
                k = -k;
            }
            power.direct = k * this.attributes.power[axis];
            power.back = (k < 0 ? -1:1) * k * this.backPower[axis]; //use opposite direction for back force
        }
        //fluctuation spread calculation, pick random direction
        else{
            power.back = (Math.random() < 0.5 ? -1 : 1) * this.backPower[axis];
        }

        return power;
    }
};