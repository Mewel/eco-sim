import {MeshPhongMaterial} from "three";

export class TerrainMaterial extends MeshPhongMaterial {

  constructor(parameters) {
    super(parameters);
    this.terrain = [];
  }

  shaderParsVertex() {
    return `
      varying float vAmount;
      varying vec2 vUV;
    `;
  }

  shaderVertex() {
    return `
      vUV = uv;
      vAmount = position.y * .1;\n`;
  }

  shaderParsFragment() {
    let result = "";
    let i = 0;
    this.terrain.forEach(t => {
      result += "uniform sampler2D tex" + i++ + "Texture;\n";
    });
    result += `
          varying float vAmount;
          varying vec2 vUV;\n`
    return result;
  }

  shaderFuncFragment() {
    return `
    vec4 hash4( vec2 p ) { return fract(sin(vec4( 1.0+dot(p,vec2(37.0,17.0)),
                                          2.0+dot(p,vec2(11.0,47.0)),
                                          3.0+dot(p,vec2(41.0,29.0)),
                                          4.0+dot(p,vec2(23.0,31.0))))*103.0); }
    vec4 textureNoTile( sampler2D samp, in vec2 uv ) {
        vec2 p = floor( uv );
        vec2 f = fract( uv );
        // derivatives (for correct mipmapping)
        vec2 ddx = dFdx( uv );
        vec2 ddy = dFdy( uv );
        // voronoi contribution
        vec4 va = vec4( 0.0 );
        float wt = 0.0;
        for( int j=-1; j<=1; j++ ){
          for( int i=-1; i<=1; i++ ) {
            vec2 g = vec2( float(i), float(j) );
            vec4 o = hash4( p + g );
            vec2 r = g - f + o.xy;
            float d = dot(r,r);
            float w = exp(-5.0*d );
            vec4 c = textureGrad( samp, uv + o.zw, ddx, ddy );
            va += w*c;
            wt += w;
          }
        }
        // normalization
        return va/wt;
    }\n`
  }

  shaderFragment() {
    let result = "";
    let i = 0;
    this.terrain.forEach(t => {
      let id = "tex" + i++;
      result += "vec4 " + id + " = (smoothstep(" + t.blend[0].toFixed(2) + "," + t.blend[1].toFixed(2) + ", vAmount)";
      if (t.blend.length >= 4) {
        result += "- smoothstep(" + t.blend[2].toFixed(2) + "," + t.blend[3].toFixed(2) + ", vAmount)";
      }
      result += ") * textureNoTile(" + id + "Texture, vUV *" + t.scale.toFixed(2) + ");\n"
    });
    i = 0;
    result += "diffuseColor = vec4(0.0, 0.0, 0.0, 1.0) + " + this.terrain.map(t => "tex" + i++).join("+") + ";";
    return result;
  }

  onBeforeCompile(shader, renderer) {
    let i = 0;
    this.terrain.forEach(t => shader.uniforms["tex" + i++ + "Texture"] = {type: "t", value: t.value})

    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      this.shaderParsVertex() + "#include <common>"
    );
    shader.vertexShader = shader.vertexShader.replace('#include <fog_vertex>',
      "#include <fog_vertex>" + this.shaderVertex()
    );

    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      this.shaderParsFragment() + "#include <common>"
    );
    shader.fragmentShader = shader.fragmentShader.replace('void main() {',
      this.shaderFuncFragment() + 'void main() {'
    );
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      this.shaderFragment()
    );
  }

}
