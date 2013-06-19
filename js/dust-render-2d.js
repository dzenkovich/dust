/**
 * @fileOverview Flying Dust music visualization. A webkit audio API experiment by Denis Zenkovich.
 * 2D renderer component.
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
 * The Renderer - object that handles the visual output of the dust scene.
 * 2D mode display using regular canvas.
 *
 * @type {Object}
 * @constructor
 * @param {Object} options An object with any of the following properties:
 * <dl>
 *     <dt>size</dt><dd>Object of width and height values of the desired view-port.</dd>
 *     <dt>texture</dt><dd>String link to speck texture image, to be used at single speck rendering.</dd>
 * </dl>
 */
Dust.Renderer = function(options){
    if(typeof this.initialize == 'function') this.initialize(options);
};

Dust.Renderer.prototype = {
    //default attributes
    defaults: {
        texture: 'particle2.png',
        flashTexture: 'flash.png',
        flashWidth: 100,
        flashHeight: 100,
        size: {
            width: 640,
            height: 480
        }
    },
    _buffers: {}, //list of various speck color and opacity display buffers
    _flash: null, //object with flash related data, buffer, sizes, etc
    attributes: null, //full set of options - merge of user options with defaults
    canvas: null, //scene canvas
    ctx: null, //canvas context
    texture: null, //speck texture
    ready: false, //is textures loaded

    /**
     * @constructs Dust.Renderer
     */
    initialize: function (options) {
        //merge options with defaults into a new attributes object
        this.attributes = Dust.Cloud.prototype._extend(Dust.Cloud.prototype._extend({}, this.defaults), options);

        this._createCanvas();
        this._loadTexture();
    },

    /**
     * Render the scene - place all generated specks on the canvas.
     *
     * @param {Array} specks List of all active Specks on the scene.
     */
    render: function(specks) {
        var buffer,
            speck,
            i = 0,
            r,
            pos,
            w = this.attributes.size.width,
            h = this.attributes.size.height;

        if(!this.ready) return;

        this.ctx.clearRect(-w/2, -h/2, w, h);

        for (; i < specks.length; i++) {
            speck = specks[i];

            if(!speck.isDead()){ //we don't have zombie specks! :)
                r = speck.attributes.radius;
                pos = speck.attributes.position;
                if(pos.x < (w/2 + r) && pos.x > (-w/2 - r) && pos.y < (h/2 + r) && pos.y > (-h/2 - r)){
                    buffer = this._renderSpeck(speck);
                    this._placeSpeck(speck, buffer);
                }
            }
        }
    },

    /**
     * Prepare canvas element - the scene.
     *
     * @private
     */
    _createCanvas: function(){
        var w = this.attributes.size.width;
        var h =  this.attributes.size.height;

        this.canvas = document.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.translate(w/2, h/2);

        document.body.appendChild(this.canvas);
    },

    /**
     * Load speck and flash textures
     *
     * @private
     */
    _loadTexture: function(){
        var count = 2;

        this.texture = new Image();
        this.texture.addEventListener('load', function(){
            count--;
            this.ready = count == 0;
        }.bind(this));
        this.texture.src = this.attributes.texture;

        this.flashTexture = new Image();
        this.flashTexture.addEventListener('load', function(){
            count--;
            this.ready = count == 0;
        }.bind(this));
        this.flashTexture.src = this.attributes.flashTexture;
    },

    /**
     * Render single speck display. Uses specks dot buffers for optimized rendering.
     * Applies flash image if speck is at the end of it's life.
     *
     * @param {Object} speck {@link Dust.Speck} object.
     * @return {Element} canvas speck display buffer.
     * @private
     */
    _renderSpeck: function(speck){
        var hsv,
            rgb,
            color,
            opacity,
            size,
            saturation = speck.attributes.colorSaturation,
            buffer,
            flashBuffer;

        color = this._hexToRgb(speck.attributes.color);
        opacity = speck.attributes.density;

        hsv = this._RGBtoHSV(color);
        hsv[1] = saturation;
        rgb = this._HSVtoRGB(hsv);

        if(speck.attributes.flashLifePart){
            size = (1 - speck.attributes.flashLifePart) * speck.attributes.radius * 2;
            buffer = this._getBuffer(rgb, opacity);

            this._makeFlash(speck);
            flashBuffer = this._flash.buffer;
            this._flash.ctx.drawImage(buffer, 0, 0, buffer.width, buffer.width, - size/2, - size/2, size, size);

            buffer = flashBuffer;
        }
        else{
            buffer = this._getBuffer(rgb, opacity);
        }

        return buffer;
    },

    /**
     * Get canvas speck element for specified color and opacity,
     * if no such found - triggers creation of the buffer.
     *
     * @param {Array} color RGB(A) color array.
     * @param {Number} opacity Speck opacity value.
     * @return {Element} default speck display buffer.
     * @private
     */
    _getBuffer: function(color, opacity){
        var name;

        opacity = opacity.toFixed(1);
        name = color.join('-') + '|' + opacity;

        if(!this._buffers[name]){
            this._buffers[name] = this._createBuffer(color, opacity);
        }

        return this._buffers[name];
    },

    /**
     * Create speck dot canvas buffer for the given color and opacity.
     *
     * @param {Array} color RGB(A) color array.
     * @param {Number} opacity Speck opacity value.
     * @return {Element} Canvas colored and opaque speck buffer.
     * @private
     */
    _createBuffer: function(color, opacity){
        var buffer,
            bctx,
            w,
            h;

        w = this.texture.width;
        h = this.texture.height;
        buffer = document.createElement('canvas');
        buffer.width = w;
        buffer.height = h;
        bctx = buffer.getContext('2d');
        //apply opacity
        bctx.globalAlpha = opacity;
        bctx.drawImage(this.texture, 0, 0);
        //apply color
        bctx.globalCompositeOperation = 'source-atop';
        bctx.fillStyle = this._colorString(color);
        bctx.fillRect(0, 0, w, h);

        return buffer;
    },

    /**
     * Create flash image for the speck basing on it's remaining life time.
     *
     * @param {Object} speck {@link Dust.Speck} object.
     * @private
     */
    _makeFlash: function(speck){
        var tw,
            th,
            x,
            y,
            dLife = speck.attributes.flashLifePart,
            w = this.flashTexture.width,
            h = this.flashTexture.height,
            angle;

        //create basic flash buffer if not yet created
        if(!this._flash){
            var diagonal = Math.sqrt(Math.pow(this.flashTexture.width, 2) + Math.pow(this.flashTexture.height, 2));
            var buffer = document.createElement('canvas');

            //save buffer data into object
            this._flash = {
                buffer: buffer,
                ctx: buffer.getContext('2d'),
                diagonal: diagonal
            };

            //cause we rotate the flash, buffer should fit the texture by diagonal
            this._flash.buffer.width = this._flash.buffer.height = diagonal;
            this._flash.ctx.translate(diagonal/2, diagonal/2);
            this._flash.ctx.globalCompositeOperation = 'lighten';
        }

        //resulting size of the flash, the less life left the bigger the flash
        th = dLife * this.attributes.flashHeight;
        tw = dLife * this.attributes.flashWidth;
        //canvas is translated, so we need to make sure flash center lays down into 0, 0 point.
        x = - tw / 2;
        y = - th / 2;
        //flash rotate angle as provided by speck
        angle = speck.attributes.flashAngle + dLife * speck.attributes.flashRotateAngle;

        this._flash.ctx.clearRect(-this._flash.diagonal, -this._flash.diagonal, this._flash.diagonal * 2, this._flash.diagonal * 2);
        this._flash.ctx.globalAlpha = speck.attributes.density;
        this._flash.ctx.rotate(angle);
        this._flash.ctx.drawImage(this.flashTexture, 0, 0, w, h, x, y, tw, th);
        this._flash.ctx.globalAlpha = 1;
        this._flash.ctx.rotate(-angle);
    },

    /**
     * Place speck into appropriate position at the scene with appropriate size
     *
     * @param speck
     * @param buffer
     * @private
     */
    _placeSpeck: function(speck, buffer){
        var x,
            y,
            tw = buffer.width,
            th = buffer.height,
            size = (speck.attributes.radius * 2 / this.texture.width ) * tw;

        x = speck.attributes.position.x - size/2;
        y = speck.attributes.position.y - size/2;
        this.ctx.drawImage(buffer, 0, 0, tw, th, x, y, size, size);
    },

    /**
     * Utility. Convert HEX color string into RGB array.
     *
     * @param {String} hex color string.
     * @returns {Array} RGB color array.
     * @private
     */
    _hexToRgb: function (hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    },

    /**
     * Utility. Create RGB color string for canvas fillStyle property from RGB array.
     *
     * @param {Array} array RGB color array.
     * @returns {String} canvas rgb string.
     * @private
     */
    _colorString: function(array){
        return (array.length == 4?'rgba':'rgb') + '(' + array.join(', ') + ')';
    },

    /**
     * Convert RGB array into HSV array.
     *
     * @author <a href="http://stackoverflow.com/questions/13806483/increase-or-decrease-color-saturation/13807455#13807455">Hoffmann</a>
     * @param {Array} color RGB color array.
     * @returns {Array} HSV color array.
     * @private
     */
    _RGBtoHSV: function (color) {
        var r = color[0],
            g = color[1],
            b = color[2],
            h,
            s,
            v,
            min = Math.min(r, g, b),
            max = Math.max(r, g, b),
            delta;

        v = max;
        delta = max - min;
        if (max != 0)
            s = delta / max;        // s
        else {
            // r = g = b = 0        // s = 0, v is undefined
            s = 0;
            h = -1;
            return [h, s, undefined];
        }
        if (r === max)
            h = ( g - b ) / delta;      // between yellow & magenta
        else if (g === max)
            h = 2 + ( b - r ) / delta;  // between cyan & yellow
        else
            h = 4 + ( r - g ) / delta;  // between magenta & cyan
        h *= 60;                // degrees
        if (h < 0)
            h += 360;
        return [h, s, v];
    },

    /**
     * Convert HSV array into RGB array.
     *
     * @author <a href="http://stackoverflow.com/questions/13806483/increase-or-decrease-color-saturation/13807455#13807455">Hoffmann</a>
     * @param {Array} color HSV color array.
     * @returns {Array} RGB color array.
     * @private
     */
    _HSVtoRGB: function (color) {
        var i,
            h = color[0],
            s = color[1],
            v = color[2],
            r,
            g,
            b,
            f,
            p,
            q,
            t;

        if (s === 0) {
            // achromatic (grey)
            r = g = b = v;
            return [r, g, b];
        }
        h /= 60;            // sector 0 to 5
        i = Math.floor(h);
        f = h - i;          // factorial part of h
        p = v * ( 1 - s );
        q = v * ( 1 - s * f );
        t = v * ( 1 - s * ( 1 - f ) );
        switch (i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:        // case 5:
                r = v;
                g = p;
                b = q;
                break;
        }
        return [Math.round(r), Math.round(g), Math.round(b)];
    }
};


