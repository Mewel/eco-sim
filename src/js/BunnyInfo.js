import {CSS2DObject} from "three/examples/jsm/renderers/CSS2DRenderer";

export class BunnyInfo {

  constructor(bunny) {
    this.bunny = bunny;
    this.content = this.create();
    this.infoObject = new CSS2DObject(this.content);
    this.infoObject.position.set(0, 50, 0);
    this.bunny.model.add(this.infoObject);
    this.i = 0;

    this.actionElement = this.content.getElementsByClassName("action")[0];
    this.thirstProgressElement = this.content.getElementsByClassName("thirst")[0].getElementsByClassName("progress-bar")[0];
  }

  create() {
    let template = document.createElement('template');
    template.innerHTML = `
      <div class="info">
        <div class="thirst progress">
          <span style="width: 0%" class="progress-bar"></span>
          <span class="progress-text">thirst</span>
        </div>
        <div class="action">jumping</div>
      </div>;
    `.trim();
    return template.content.firstChild;
  }

  update() {
    // this.actionElement.textContent = "" + (this.i++);
    this.i += .01;
    this.thirstProgressElement.style.width = this.i + "%";
  }

}