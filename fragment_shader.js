

  #ifdef GL_ES
  precision lowp float;
  #endif

  #define PI 3.14159265359

  uniform float uTime;
  uniform vec2 u_mouse;
  attribute vec4 a_color;

  void main(void) {
    vec2 st = gl_FragCoord.xy/vec2(640,480);
    float r = a_color.r;
    float g = a_color.g;
    float b = a_color.b;
    vec3 color = vec3(r,b,g);
    gl_FragColor = vec4(color,1.0);
  }