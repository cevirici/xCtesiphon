
    /**
     * Inits the WebGL or returns false if it couldn't be loaded.
     */
    function getWebGL() {
        var canvas = document.getElementById('testCanvas');
        var webgl = canvas.getContext('webgl')
            || canvas.getContext('experimental-webgl');
 
        if (!webgl || !(webgl instanceof WebGLRenderingContext)) {
            return false;
        }
 
        return webgl;
    }
 
    /**
     * Creates the vertex buffer, binds it, passes the vortex data to it,
     * and sets the color.
     */
    function initWebGL(webgl, vortexes) {
        var vertexBuffer = webgl.createBuffer();
 
        webgl.bindBuffer(webgl.ARRAY_BUFFER, vertexBuffer);
 
        webgl.bufferData(
            webgl.ARRAY_BUFFER,
            new Float32Array(vortexes),
            webgl.STATIC_DRAW
        );
 
        webgl.clearColor(0, 0.5, 0.5, 0.9);
 
        webgl.clear(webgl.COLOR_BUFFER_BIT);
    }
 
    /**
     * Creates the vertex shader object from the source code defined in
     * 2_vertex_shader.js.
     */
    function createVertexShader() {
        var vertexShader = webgl.createShader(webgl.VERTEX_SHADER);
        webgl.shaderSource(vertexShader, vertexCode);
        webgl.compileShader(vertexShader);
 
        return vertexShader;
    }
 
    /**
     * Creates the fragment shader object from the source code defined in
     * 2_vertex_shader.js.
     */
    function createFragmentShader() {
        var fragmentShader = webgl.createShader(webgl.FRAGMENT_SHADER);
 
        webgl.shaderSource(fragmentShader, fragmentCode);
        webgl.compileShader(fragmentShader);
 
        return fragmentShader;
    }
 
    /**
     * Create and attach the shader programs from the shader compiled objects.
     */
    function createShaderProgram(webgl, vertexShader, fragmentShader) {
        var shaderProgram = webgl.createProgram();
 
        webgl.attachShader(shaderProgram, vertexShader); 
        webgl.attachShader(shaderProgram, fragmentShader);
        webgl.linkProgram(shaderProgram);
        webgl.useProgram(shaderProgram);
 
        return shaderProgram;
    }
 
 
    /**
     * Gets and sets the coordinates associating the compiled shader programs
     * to buffer objects.
     */
    function transformCoordinatesAndSet(webgl, shaderProgram) {
        var coordinates = webgl.getAttribLocation(
            shaderProgram,
           'coordinates'
        );
 
        webgl.vertexAttribPointer(
            coordinates,
            2,
            webgl.FLOAT,
            false,
            0,
            0
        );
 
        webgl.enableVertexAttribArray(coordinates);
    }
 
    /**
     * Draws the arrays.
     */
    function drawArrays(webgl, len) {
        webgl.drawArrays(webgl.TRIANGLES, 0, len);
    }