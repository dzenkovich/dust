/**
 * @fileOverview Simple basic 'slider' bar based on <a href="https://gist.github.com/kosso/1118840">code by Kosso</a>
 *
 * @author <a href="http://dzenkovich.com">Denis Zenkovich</a>
 * @version 1
 */

/**
 * Slider bar.
 *
 * @param options
 * @constructor
 */
var Slider = function(options){
    var bar, //bar div
        slider, //slider div
        toggle, //toggle div
        percent, //part of bar selected, ranges from 0 to 1
        that = this; //self reference for closures

    /**
     * slider initialization
     *
     * @param {Object} options object with slider setting, container, starting value and callback
     * @private
     */
    function _init(options){
        _construct();

        //render bar into container
        if(options.container && options.container.appendChild){
            options.container.appendChild(bar);
        }
        else{
            document.getElementById(options.container).appendChild(bar);
        }

        //set starting value
        if(options.value){
            that.value(options.value);
        }
    };

    /**
     * Create slider bar elements
     *
     * @private
     */
    function _construct(){
        bar = document.createElement('div');
        bar.className = 'slider-bar';
        slider = document.createElement('div');
        slider.className = 'slider-slider';
        bar.appendChild(slider);
        toggle = document.createElement('div');
        toggle.className = 'slider-toggle';
        slider.appendChild(toggle);

        bar.addEventListener('mousedown', _startSlide, false);
    };

    /**
     * Start slider mousedown event handler
     *
     * @param {Event} e mouse event
     * @private
     */
    function _startSlide(e){
        var x = e.offsetX==undefined?e.layerX:e.offsetX;

        percent = (x / bar.offsetWidth).toFixed(2);
        slider.style.width = (percent * 100) + '%';

        document.addEventListener('mousemove', _moveSlide, false);
        document.addEventListener('mouseup', _stopSlide, false);

        _onChange();
    };

    /**
     * Move slider mousemove event handler
     *
     * @param {Event} e mouse event
     * @private
     */
    function _moveSlide(e){
        if(e.target == bar){
            var x = e.offsetX==undefined?e.layerX:e.offsetX;

            percent = (x / bar.offsetWidth).toFixed(2);
            slider.style.width = (percent * 100) + '%';
            _onChange();
        }
    };

    /**
     * Stop slider mouseup event handler
     *
     * @param {Event} e mouse event
     * @private
     */
    function _stopSlide(e){
        document.removeEventListener('mousemove', _moveSlide, false);
        document.removeEventListener('mousemove', _stopSlide, false);
    };

    /**
     * On slider value changed handler.
     *
     * @private
     */
    function _onChange(){
        if(typeof options.onChange == 'function'){
            options.onChange(percent);
        }
    };

    /**
     * Set or Get slider value.
     *
     * @param {Number} value to set slider to
     * @returns {Number} slider value
     */
    this.value = function(value){
        if(value == null){
            return percent;
        }
        else{
            percent = (value > 1 ? 1 : (value < 0 ? 0 : value));
            slider.style.width = (percent * 100) + '%';
            _onChange();
        }
    };

    _init(options);
};