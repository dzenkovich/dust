/**
 * @fileOverview Flying Dust music visualization. A webkit audio API experiment by Denis Zenkovich.
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
 * Cloud object prototype methods and properties
 *
 * @type {Object}
 * @constructor
 * @param {Object} options An object with any of the following properties:
 * <dl>
 *     <dt>width</dt><dd>Width of the screen - defaults to window width.</dd>
 *     <dt>height</dt><dd>Height of the screen - defaults to window height.</dd>
 *     <dt>poolSize</dt><dd>The size of specks pool - maximum possible specks at the scene.</dd>
 *     <dt>specks</dt><dd>Number of specks to show at start.</dd>
 *     <dt>throwRate</dt><dd>Rate of specks thrown per music frequency group action.</dd>
 *     <dt>throwTypes</dt><dd>Names of {@link Dust.Music} frequency groups to be used at specks throwing.</dd>
 *     <dt>throwColors</dt><dd>Array of colors for spec throw, in order of throwTypes.</dd>
 *     <dt>throwInertiaFactor</dt><dd>Array of starting inertia for spec throw, in order of throwTypes.</dd>
 *     <dt>throwFrom</dt><dd>Array of direction for spec throw, in order of throwTypes.</dd>
 *     <dt>maxLag</dt><dd>Maximum animation lag, if hit - specks deletion starts.</dd>
 *     <dt>maxToDelete</dt><dd>Maximum number of specks can be deleted in single run, % from total.</dd>
 * </dl>
 */
Dust.Cloud = function(options){
    options = options || {};

    if(typeof this.initialize == 'function') this.initialize(options);
};
/**
 * Cloud object prototype methods and properties
 * @type {Object}
 */
Dust.Cloud.prototype = {
    //revert constructor property
    constructor: Dust.Cloud,

    //default options
    defaults: {
        poolSize: 1000,
        specks: 0,
        throwRate: 1,
        throwTypes: ['bitBass', 'middleLow', 'middleMed', 'middleHigh'],
        throwColors: ['#b725a3', '#ffa11b', '#63eec2', '#e3ee63'],
        throwInertiaFactor: [0.3, 0.5, 0.5, 0.5],
        throwFrom: ['bottom', 'low-sides', 'low-sides', 'up-sides'],
        maxLag: 0.03, //seconds of optimal animation lag 1/lag = fps
        maxToDelete: 0.05 //% of max specks to delete
    },
    options: {}, //full set of options - merge of user options with defaults
    viewPortSize: {}, //screen size object
    activeSpecks: 0, //number of active specks flying around the scene
    specks: [], //list of all Specks - the pool
    breezes: [], //list of all Breeze objects - force waves
    renderer: null, //Dust Renderer object, dust-renderer-2d by default
    music: null, //Dust Music object
    throw: null, //list of possible emitting locations and their parameters
    lastTime: null, //last animation timestamp

    /**
     * @constructs Dust.Cloud
     */
    initialize: function(options){
        var breeze,
            i = 0,
            types,
            maxPerType = {
                'bitBass': 350,
                'middleLow': 270,
                'middleMed': 230,
                'middleHigh': 230
            };

        if(!this.checkSupport(options.noSupportElement)) return; //stop running if not supported

        this.throw = {}; //options of specs being thrown

        this.options = this._extend(this._extend({}, this.defaults), options);

        this.viewPortSize = {
            width: options.width || document.documentElement.clientWidth,
            height: options.height || document.documentElement.clientHeight - 5
        };

        this.renderer = new Dust.Renderer({ size:  this.viewPortSize });

        breeze = new Dust.Breeze({ type: 'up', size:  this.viewPortSize });
        this.breezes.push(breeze); //default lifting up wind

        this.music = new Dust.Music();

        //make the breeze a music's bass wave
        this.music.set('lowBass', function(overall){
            breeze.setPower( overall );
        });
        //make specks to respond with bright color on high music frequencies
        this.music.set('high', function(overall){
            var i = 0;

            for(; i < this.specks.length; i++){
                this.specks[i].color( overall );
            }
        }.bind(this));

        //setup emitters for all possible music frequencies
        types = this.options.throwTypes;
        for(; i < types.length; i++){
            this.throw[types[i]] = {
                color: this.options.throwColors.shift() || '#fff',
                inertiaFactor: this.options.throwInertiaFactor.shift() || 0.5,
                from: this.options.throwFrom.shift() || 'bottom'
            };

            this.music.set(types[i], function(overall, type){
                var max = maxPerType[type],
                    min = max * 2 / 3,
                    count;

                if(overall > min){
                    count = ((overall - min) / (max - min));
                    this.throwSpecks(type, count);
                }
            }.bind(this));
        }

        this.fill(); //create specks pool and throw starter specks
        this._animate(); //start animation loop
    },

    /**
     * Check if AudioContext is supported and music analise is possible
     *
     * @param {Object} element DOM element to display if no webkitAudioContext support
     * @return {Boolean}
     */
    checkSupport: function(element){
        if(!(window.AudioContext || window.webkitAudioContext)){
            if(element){
                element.style.display = 'block';
            }
            return false;
        }
        return true;
    },

    /**
     * Create specks pool and generate starting specks with quantity as of set in  options.specks
     */
    fill: function(){
        var i = 0,
            c = 0,
            speck,
            pos;

        //fill the pool with dead specks
        for(; i < this.options.poolSize; i++){
            speck = new Dust.Speck();
            this.specks.push(speck);
        }

        //revive a portion of specks as set in options
        for(; c < this.options.specks; c++){
            speck = this.specks[this.activeSpecks + c];
            if(!speck) break;

            pos = this.generateSpot();
            this.specks[c].reset({position: pos});
        }

        this.activeSpecks+= c; //update live specks count
    },

    /**
     * Generate random speck position basing on Gaussian Distribution
     *
     * @return {Object} position object with x and y coordinates
     */
    generateSpot: function(){
        var pos = {},
            maxX = this.viewPortSize.width,
            maxY = this.viewPortSize.height,
            maxZ = this.viewPortSize.width,
            random;

        //generate x coordinate relative to center.
        random = Math.random();
        pos.x = maxX * (Math.random() < 0.5?-1:+1) * this._gaussSimplified(random);
        //generate y coordinate relative to center.
        random = Math.random();
        pos.y = maxY * (Math.random() < 0.5?-1:+1) * this._gaussSimplified(random);
        //generate y coordinate relative to center.
        random = Math.random();
        pos.z = maxZ / 2 * this._gaussSimplified(random);

        return pos;
    },

    /**
     * Throw speck into canvas. Color, starting location, direction and inertia are based on throw options
     *
     * @param {String} type The name of throw set, same as the name of {@link Dust.Music} frequency group
     * @param {Number} rate The % difference between current magnitude and maximum magnitude
     */
    throwSpecks: function(type, rate){
        var num = rate * this.options.throwRate,
            i = 0,
            data,
            speck;

        for(; i < num; i++){
            speck = this.specks[this.activeSpecks + i];
            if(!speck) break;

            data = this.generateThrowDirection(type);
            speck.reset(data);
        }

        this.activeSpecks+= i;
    },

    /**
     * Generate throw direction parameters, coordinates, inertia, color
     *
     * @param {String} type The name of throw set, same as the name of {@link Dust.Music} frequency group
     * @return {Object} Object containing starting position, inertia and color
     */
    generateThrowDirection: function(type){
        var data = {},
            pos = {},
            inertia = {},
            random,
            params = this.throw[type],
            maxX = this.viewPortSize.width,
            maxY = this.viewPortSize.height,
            maxZ = this.viewPortSize.width,
            spread = (0.3 * Math.random() + 0.2);

        if(!params) return {};

        //generate x coordinate relative to center.
        random = Math.random();
        pos.z = maxZ / 2 * this._gaussSimplified(random);
        inertia.z = 0;

        if(params.from == 'bottom'){
            pos.x = maxX * (Math.random() < 0.5?-1:+1) * this._gaussSimplified(random);
            pos.y = maxY/2;
            inertia.y = - maxY/2 * params.inertiaFactor;
            inertia.x = (Math.random() < 0.5?-1:+1) * inertia.y * spread;
        }
        if(params.from == 'low-sides'){
            pos.x = (Math.random() < 0.5?-1:+1) * maxX/2;
            pos.y = maxY/2 * this._gaussSimplified(random);
            inertia.x = (pos.x < 0 ? 1 : -1) * maxX/2 * params.inertiaFactor;
            inertia.y = (Math.random() < 0.5?-1:+1) * inertia.x * spread;
        }
        if(params.from == 'up-sides'){
            pos.x = (Math.random() < 0.5?-1:+1) * maxX/2;
            pos.y = - maxY/2 * this._gaussSimplified(random);
            inertia.x = (pos.x < 0 ? 1 : -1) * maxX/2 * params.inertiaFactor;
            inertia.y = (Math.random() < 0.5?-1:+1) * inertia.x * spread;
        }

        data.position = pos;
        data.inertia = inertia;
        data.color = params.color;

        return data;
    },

    /**
     * Request animation frame callback
     *
     * @private
     */
    _animate: function(){
        var i = 0,
            j,
            lenB = this.breezes.length,
            dt = this._dt(),
            speck,
            numToDelete,
            _animationFrame;

        this.music.apply(); //apply music frequencies magnitude

        //kill specks if animation starts to lag
        if(dt >= this.options.maxLag){
            numToDelete = this.activeSpecks * ((dt -  this.options.maxLag) / this.options.maxLag);

            if(numToDelete > this.activeSpecks * this.options.maxToDelete){
                numToDelete = this.activeSpecks * this.options.maxToDelete;
            }
            this._deleteSpecks(numToDelete);
        }

        //animate all alive specks
        for(; i < this.activeSpecks; i++){
            speck = this.specks[i];

            for(j = 0; j < lenB; j = j+1){
                this.breezes[j].apply(speck);
            }

            speck.fly(dt);

            if(speck.isDead()){
                this.specks[i] = this.specks[this.activeSpecks - 1];
                this.specks[this.activeSpecks - 1] = speck;

                this.activeSpecks--;
                i--;
            }
        }

        //pass all alive specks to renderer for display
        this.renderer.render(this.specks.slice(0, this.activeSpecks));

        //continue animation loop
        _animationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
        _animationFrame(this._animate.bind(this));
    },

    /**
     * Calculate animation delta time in seconds
     *
     * @return {Number} Time passed from previous animation frame
     * @private
     */
    _dt: function(){
        var time = Date.now(),
            dt;

        if(!this.lastTime) this.lastTime = time;
        dt = (time - this.lastTime) / 1000; //measured in seconds

        this.lastTime = time;

        return dt;
    },

    /**
     * Kill the specks from the beginning of the pool. Note specks get it's life reduced,
     * allowing to play 'die' animation before disappearing.
     *
     * @param {Number} num Number of specks to delete.
     * @private
     */
    _deleteSpecks: function(num){
        var i = 0,
            speck;

        for(; i < num; i++){
            if(!this.specks[num]) break;
            this.specks[num].shortenLife();
        }
    },

    /**
     * Copy object properties to other object, NOT DEEP copy
     *
     * @param {Object} to Object to copy to
     * @param {Object} from Object to grab properties from
     * @return  {Object} resulting object - "to" object with added properties
     * @private
     */
    _extend: function(to, from){
        var i;

        for(i in from){
            if(from.hasOwnProperty(i)){
                to[i] = from[i];
            }
        }

        return to;
    },

    /**
     * Calculate the Gaussian Distribution for the given number
     *
     * @param {Number} x Function parameter x
     * @return {Number} Function value (y)
     * @private
     */
    _gaussSimplified: function(x){
        var root = Math.sqrt(2 * Math.PI);

        return Math.abs(Math.exp(- (x * x) / (2 * 0.2) ) / (0.44 * root) - 0.9);
    }
}