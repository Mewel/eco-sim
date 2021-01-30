import {CSS2DObject} from "three/examples/jsm/renderers/CSS2DRenderer";

export class BunnyInfo {

  constructor(bunny) {
    this.bunny = bunny;
    this.content = this.create();
    this.infoObject = new CSS2DObject(this.content);
    this.bunny.model.add(this.infoObject);
    this.actionElement = this.content.getElementsByClassName("action")[0];
    this.exhaustionProgressElement = this.content.getElementsByClassName("exhaustion")[0].getElementsByClassName("progress-bar")[0];
    this.thirstProgressElement = this.content.getElementsByClassName("thirst")[0].getElementsByClassName("progress-bar")[0];
    this.hungerProgressElement = this.content.getElementsByClassName("hunger")[0].getElementsByClassName("progress-bar")[0];
  }

  create() {
    let template = document.createElement('template');
    template.innerHTML = `
      <div class="info">
        <div class="exhaustion progress">
          <span style="width: 0%" class="progress-bar"></span>
          <span class="progress-text">exhaustion</span>
        </div>
        <div class="thirst progress">
          <span style="width: 0%" class="progress-bar"></span>
          <span class="progress-text">thirst</span>
        </div>
        <div class="hunger progress">
          <span style="width: 0%" class="progress-bar"></span>
          <span class="progress-text">hunger</span>
        </div>
        <div class="action"></div>
      </div>;
    `.trim();
    return template.content.firstChild;
  }

  update(camera) {
    this.infoObject.position.set(0, 20 + camera.position.y / 8, 0);

    this.actionElement.textContent = this.bunny.action.description;
    this.thirstProgressElement.style.width = (this.bunny.thirst * 100) + "%";
    this.hungerProgressElement.style.width = (this.bunny.hunger * 100) + "%";
    this.exhaustionProgressElement.style.width = (this.bunny.exhaustion * 100) + "%";
  }

}