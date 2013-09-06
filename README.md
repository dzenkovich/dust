dust
====

Dust Music Visualization
This is my personal experiment using Canvas and Web Audio API technologies.
You can find the [working demo here](http://lab.dzenkovich.com/Dust/)

===

In this repo you can find:
###dust.js

Cloud – the main aggregator object, cloud is responsible for generating specs, assigning them initial parameters (position and inertia) and most importantly is serves as items pool for specks to minimize Garbage Collector freezes.

###dust-speck.js

Speck – the single speck object. Responsible for all functionality specific to speck model in virtual environment – inertia, position, forces valid at the given moment, and physical properties such as density, weight and size.

###dust-breeze.js

Breeze – stands for wind-like force that is applied to the specks.  Right not it’s limited to blow from one of the sides of the screen, I’m using only the bottom one, but you are up for experiments ! In the demo I have, Breeze is manipulated by Music.

###dust-music.js

Music – this component deals with audio track playback and connecting analyzers to the audio source. This is the part where all Audio API magic happens. Additionally this object creates functionality for play/pause and volume controls for the audio buffer in use. This custom controls overhead come due to the browser bug – when you use an HTML5 Audio element and attach Analyzer to it, it’s volume control stops working (at least that was so on the moment of wirting).

###dust-render-2d.js

Renderer – this is the drawing object, it creates the Canvas element, and does all the actual placement of the specks to the scene. All drawing is concentrated here this is nice cause gives ability to use different renderer classes. You are up to experiments in CSS3 renderer or WebGL renderer if you’d like to! 

===

Have fun!
Would love to hear your feedback – please post comments right here at github or [at my blog](http://dzenkovich.com/2013/09/dust-music-visualisation/)
